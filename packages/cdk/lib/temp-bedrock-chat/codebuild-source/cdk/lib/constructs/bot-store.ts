import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { generatePhysicalName } from "../utils/generate-physical-name";
import * as logs from "aws-cdk-lib/aws-logs";
import * as oss from "aws-cdk-lib/aws-opensearchserverless";
import * as osis from "aws-cdk-lib/aws-osis";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  ObjectOwnership,
} from "aws-cdk-lib/aws-s3";
import { CfnOutput, RemovalPolicy, Stack } from "aws-cdk-lib";
import {
  Effect,
  IRole,
  Policy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { z } from "zod";
import { BotStoreLanguageSchema } from "../utils/parameter-models";

export type Language = z.infer<typeof BotStoreLanguageSchema>;

export interface OsisPipelineConfigProps {
  botTable: dynamodb.ITable;
  conversationTable: dynamodb.ITable;
  osisRole: IRole;
  bucketName: string;
  endpoint: string;
  envPrefix: string;
  language: Language;
  region: string;
}

export interface BotStoreProps {
  envPrefix: string;
  readonly botTable: dynamodb.ITable;
  readonly conversationTable: dynamodb.ITable;
  readonly language: Language;
  readonly enableBotStoreReplicas: boolean;
}

export class BotStore extends Construct {
  readonly openSearchEndpoint: string;
  private collection: oss.CfnCollection;
  constructor(scope: Construct, id: string, props: BotStoreProps) {
    super(scope, id);

    const collectionName = generatePhysicalName(
      this,
      `${props.envPrefix}Collection`,
      {
        maxLength: 32,
        lower: true,
      }
    );

    const standbyReplicas =
      props.enableBotStoreReplicas === true ? "ENABLED" : "DISABLED";

    const networkPolicy = new oss.CfnSecurityPolicy(this, "NetworkPolicy", {
      name: generatePhysicalName(this, `${props.envPrefix}NetworkPolicy`, {
        maxLength: 32,
        lower: true,
      }),
      type: "network",
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: "collection",
              Resource: [`collection/${collectionName}`],
            },
            {
              ResourceType: "dashboard",
              Resource: [`collection/${collectionName}`],
            },
          ],
          AllowFromPublic: true,
        },
      ]),
    });

    const encryptionPolicy = new oss.CfnSecurityPolicy(
      this,
      "EncryptionPolicy",
      {
        name: generatePhysicalName(this, `${props.envPrefix}EncryptionPolicy`, {
          maxLength: 32,
          lower: true,
        }),
        type: "encryption",
        policy: JSON.stringify({
          Rules: [
            {
              ResourceType: "collection",
              Resource: [`collection/${collectionName}`],
            },
          ],
          AWSOwnedKey: true,
        }),
      }
    );

    this.collection = new oss.CfnCollection(this, "Collection", {
      name: collectionName,
      type: "SEARCH",
      standbyReplicas,
    });
    this.collection.applyRemovalPolicy(RemovalPolicy.DESTROY)

    const endpoint = this.collection.getAtt("CollectionEndpoint").toString();

    const bucket = new Bucket(this, "Bucket", {
      encryption: BucketEncryption.S3_MANAGED,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      objectOwnership: ObjectOwnership.OBJECT_WRITER,
      autoDeleteObjects: true,
    });

    const ingestionLogGroup = new logs.LogGroup(this, "IngensionLogGroup", {
      logGroupName:
        `/aws/vendedlogs/OpenSearchIngestion/${props.envPrefix}bot-table-osis-pipeline/${id}`.toLowerCase(),
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_WEEK,
    });

    let conversationIngestionLogGroup = new logs.LogGroup(this, "ConversationIngensionLogGroup", {
      logGroupName:
        `/aws/vendedlogs/OpenSearchIngestion/${props.envPrefix}conversation-table-osis-pipeline/${id}`.toLowerCase(),
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_WEEK,
    });

    const osisRole = new Role(this, "OsisRole", {
      assumedBy: new ServicePrincipal("osis-pipelines.amazonaws.com"),
    });
    const osisPolicy = new Policy(this, "OsisPolicy", {
      statements: [
        new PolicyStatement({
          sid: "allowRunExportJob",
          effect: Effect.ALLOW,
          actions: [
            "dynamodb:DescribeTable",
            "dynamodb:DescribeContinuousBackups",
            "dynamodb:ExportTableToPointInTime",
          ],
          resources: [
            props.botTable.tableArn,
            props.conversationTable.tableArn
          ] 
        }),
        new PolicyStatement({
          sid: "allowCheckExportjob",
          effect: Effect.ALLOW,
          actions: ["dynamodb:DescribeExport"],
          resources: [
            `${props.botTable.tableArn}/export/*`,
            `${props.conversationTable.tableArn}/export/*`
          ]
        }),
        new PolicyStatement({
          sid: "allowReadFromStream",
          effect: Effect.ALLOW,
          actions: [
            "dynamodb:DescribeStream",
            "dynamodb:GetRecords",
            "dynamodb:GetShardIterator",
          ],
          resources: [
            `${props.botTable.tableArn}/stream/*`,
            `${props.conversationTable.tableArn}/stream/*`
          ]
        }),
        new PolicyStatement({
          sid: "allowReadAndWriteToS3ForExport",
          effect: Effect.ALLOW,
          actions: [
            "s3:GetObject",
            "s3:AbortMultipartUpload",
            "s3:PutObject",
            "s3:PutObjectAcl",
          ],
          resources: [`${bucket.bucketArn}/*`],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "aoss:APIAccessAll",
            "aoss:BatchGetCollection",
            "aoss:CreateSecurityPolicy",
            "aoss:GetSecurityPolicy",
            "aoss:UpdateSecurityPolicy",
            "es:DescribeDomain",
            "es:ESHttp*",
            "logs:CreateLogGroup",
            "logs:CreateLogStream",
            "logs:PutLogEvents",
          ],
          resources: ["*"],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            "logs:CreateLogDelivery",
            "logs:PutResourcePolicy",
            "logs:UpdateLogDelivery",
            "logs:DeleteLogDelivery",
            "logs:DescribeResourcePolicies",
            "logs:GetLogDelivery",
            "logs:ListLogDeliveries",
          ],
          resources: ["*"],
        }),
      ],
    });
    osisPolicy.attachToRole(osisRole);

    const dataAccessPolicy = new oss.CfnAccessPolicy(this, "DataAccessPolicy", {
      name: generatePhysicalName(this, `${props.envPrefix}DataAccessPolicy`, {
        maxLength: 32,
        lower: true,
      }),
      type: "data",
      description: `Data access policy for ${collectionName} collection.`,
      policy: `
          [
            {
              "Rules": [
                {
                  "ResourceType": "collection",
                  "Resource": ["collection/${collectionName}"],
                  "Permission": [
                    "aoss:CreateCollectionItems",
                    "aoss:DescribeCollectionItems",
                    "aoss:DeleteCollectionItems",
                    "aoss:UpdateCollectionItems"
                  ]
                },
                {
                  "ResourceType": "index",
                  "Resource": ["index/${collectionName}/*"],
                  "Permission": [
                    "aoss:CreateIndex",
                    "aoss:DeleteIndex",
                    "aoss:UpdateIndex",
                    "aoss:DescribeIndex",
                    "aoss:ReadDocument",
                    "aoss:WriteDocument"
                  ]
                }
              ],
              "Principal": [
                "${osisRole.roleArn}"
              ]
            }
          ]
        `,
    });

    this.collection.addDependency(encryptionPolicy);
    this.collection.addDependency(networkPolicy);
    this.collection.addDependency(dataAccessPolicy);

    const region = Stack.of(this).region;
    const botOsisPipelineConfig = this._createBotOsisPipelineConfig({
      botTable: props.botTable,
      conversationTable: props.conversationTable,
      osisRole,
      bucketName: bucket.bucketName,
      endpoint,
      envPrefix: props.envPrefix,
      language: props.language,
      region,
    });

    new osis.CfnPipeline(this, "BotOsisPipeline", {
      pipelineName: generatePhysicalName(
        this,
        `${props.envPrefix}BotOsisPipeline`,
        {
          maxLength: 25,
          lower: true,
        }
      ),
      minUnits: 1,
      maxUnits: 4,
      logPublishingOptions: {
        isLoggingEnabled: true,
        cloudWatchLogDestination: {
          logGroup: ingestionLogGroup.logGroupName,
        },
      },
      // Ref: https://opensearch.org/docs/latest/data-prepper/pipelines/configuration/sinks/opensearch/
      pipelineConfigurationBody: JSON.stringify(botOsisPipelineConfig),
    });

    const conversationOsisPipelineConfig = this._createConversationOsisPipelineConfig({
      botTable: props.botTable,
      conversationTable: props.conversationTable,
      osisRole,
      bucketName: bucket.bucketName,
      endpoint,
      envPrefix: props.envPrefix,
      language: props.language,
      region,
    });

    new osis.CfnPipeline(this, "ConversationOsisPipeline", {
      pipelineName: generatePhysicalName(
        this,
        `${props.envPrefix}ConversationPipeline`,
        {
          maxLength: 25,
          lower: true,
        }
      ),
      minUnits: 1,
      maxUnits: 4,
      logPublishingOptions: {
        isLoggingEnabled: true,
        cloudWatchLogDestination: {
          logGroup: conversationIngestionLogGroup.logGroupName,
        },
      },
      pipelineConfigurationBody: JSON.stringify(conversationOsisPipelineConfig),
    });

    new CfnOutput(this, "OpenSearchEndpoint", {
      value: endpoint,
    });

    this.openSearchEndpoint = endpoint;
  }


  public addDataAccessPolicy(
    envPrefix: string,
    id: string,
    principal: IRole,
    collectionPermissions: string[],
    indexPermissions: string[]
  ): void {
    if (!this.collection) {
      throw new Error(
        "Collection is not defined. Cannot attach data access policy."
      );
    }

    const newPolicy = new oss.CfnAccessPolicy(this, id, {
      name: generatePhysicalName(this, `${envPrefix}${id}`, {
        maxLength: 32,
        lower: true,
      }),
      type: "data",
      description: `Custom Data access policy for ${this.collection.name} collection.`,
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: "collection",
              Resource: [`collection/${this.collection.name}`],
              Permission: collectionPermissions,
            },
            {
              ResourceType: "index",
              Resource: [`index/${this.collection.name}/*`],
              Permission: indexPermissions,
            },
          ],
          Principal: [principal.roleArn],
        },
      ]),
    });

    newPolicy.addDependency(this.collection);
  }

  /**
 * Generate template content for bot tables
 */
  private _genBotTemplateContent(language: Language): string {
    switch (language) {
      case "ja":
        return JSON.stringify({
          template: {
            settings: {
              analysis: {
                analyzer: {
                  ja_analyzer: {
                    type: "custom",
                    char_filter: ["icu_normalizer"],
                    tokenizer: "kuromoji_tokenizer",
                    filter: [
                      "kuromoji_baseform",
                      "kuromoji_part_of_speech",
                      "ja_stop",
                      "kuromoji_number",
                      "kuromoji_stemmer",
                    ],
                  },
                },
              },
            },
          },
        });

      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  /**
   * Generate OSIS pipeline settings for bot tables
   */
  private _createBotOsisPipelineConfig(props: OsisPipelineConfigProps): any {
    return {
      version: "2",
      "dynamodb-pipeline": {
        source: {
          dynamodb: {
            acknowledgments: true,
            tables: [
              {
                table_arn: props.botTable.tableArn,
                stream: {
                  start_position: "LATEST",
                },
                export: {
                  s3_bucket: props.bucketName,
                  s3_region: props.region,
                },
              },
            ],
            aws: {
              sts_role_arn: props.osisRole.roleArn,
              region: props.region,
            },
          },
        },
        sink: [
          {
            opensearch: {
              hosts: [props.endpoint],
              index: `${props.envPrefix}bot`,
              ...(props.language === "en"
                ? {} // For en, index_type, template_type, template_content are not required
                : {
                    index_type: "custom",
                    template_type: "index-template",
                    template_content: this._genBotTemplateContent(props.language),
                  }),
              document_id: '${getMetadata("primary_key")}',
              action: '${getMetadata("opensearch_action")}',
              document_version: '${getMetadata("document_version")}',
              document_version_type: "external",
              aws: {
                sts_role_arn: props.osisRole.roleArn,
                region: props.region,
                serverless: true,
              },
            },
          },
        ],
      },
    };
  }

  /**
   * Generate template content for conversation tables
   */
  private _genConversationTemplateContent(language: Language): string {
    switch (language) {
      case "ja":
        return JSON.stringify({
          template: {
            settings: {
              analysis: {
                analyzer: {
                  ja_analyzer: {
                    type: "custom",
                    char_filter: ["icu_normalizer"],
                    tokenizer: "kuromoji_tokenizer",
                    filter: [
                      "kuromoji_baseform",
                      "kuromoji_part_of_speech",
                      "ja_stop",
                      "kuromoji_number",
                      "kuromoji_stemmer",
                    ],
                  },
                },
              },
            },
            mappings: {
              dynamic: false,
              properties: {
                PK: {
                  type: "text",
                  fields: {
                    keyword: {
                      type: "keyword",
                      ignore_above: 256
                    }
                  }
                },
                SK: {
                  type: "text",
                  fields: {
                    keyword: {
                      type: "keyword",
                      ignore_above: 256
                    }
                  }
                },
                CreateTime: { type: "double" },
                LastUpdateTime: { type: "double" },
                Title: {
                  type: "text",
                  fields: {
                    keyword: {
                      type: "keyword",
                      ignore_above: 256
                    }
                  },
                  analyzer: "ja_analyzer"
                },
                messages: {
                  properties: {
                    id: {
                      type: "text",
                      fields: {
                        keyword: {
                          type: "keyword",
                          ignore_above: 256
                        }
                      }
                    },
                    value: {
                      properties: {
                        role: {
                          type: "text",
                          fields: {
                            keyword: {
                              type: "keyword",
                              ignore_above: 256
                            }
                          }
                        },
                        content: {
                          properties: {
                            content_type: {
                              type: "text",
                              fields: {
                                keyword: {
                                  type: "keyword",
                                  ignore_above: 256
                                }
                              }
                            },
                            body: {
                              type: "text",
                              fields: {
                                keyword: {
                                  type: "keyword",
                                  ignore_above: 256
                                }
                              },
                              analyzer: "ja_analyzer"
                            }
                          }
                        },
                        model: {
                          type: "text",
                          fields: {
                            keyword: {
                              type: "keyword",
                              ignore_above: 256
                            }
                          }
                        },
                        children: {
                          type: "text",
                          fields: {
                            keyword: {
                              type: "keyword",
                              ignore_above: 256
                            }
                          }
                        },
                        parent: {
                          type: "text",
                          fields: {
                            keyword: {
                              type: "keyword",
                              ignore_above: 256
                            }
                          }
                        },
                        create_time: { type: "double" }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      default:
        return JSON.stringify({
          template: {
            mappings: {
              dynamic: false,
              properties: {
                PK: {
                  type: "text",
                  fields: {
                    keyword: {
                      type: "keyword",
                      ignore_above: 256
                    }
                  }
                },
                SK: {
                  type: "text",
                  fields: {
                    keyword: {
                      type: "keyword",
                      ignore_above: 256
                    }
                  }
                },
                CreateTime: { type: "double" },
                LastUpdateTime: { type: "double" },
                Title: {
                  type: "text",
                  fields: {
                    keyword: {
                      type: "keyword",
                      ignore_above: 256
                    }
                  }
                },
                messages: {
                  properties: {
                    id: {
                      type: "text",
                      fields: {
                        keyword: {
                          type: "keyword",
                          ignore_above: 256
                        }
                      }
                    },
                    value: {
                      properties: {
                        role: {
                          type: "text",
                          fields: {
                            keyword: {
                              type: "keyword",
                              ignore_above: 256
                            }
                          }
                        },
                        content: {
                          properties: {
                            content_type: {
                              type: "text",
                              fields: {
                                keyword: {
                                  type: "keyword",
                                  ignore_above: 256
                                }
                              }
                            },
                            body: {
                              type: "text",
                              fields: {
                                keyword: {
                                  type: "keyword",
                                  ignore_above: 256
                                }
                              }
                            }
                          }
                        },
                        model: {
                          type: "text",
                          fields: {
                            keyword: {
                              type: "keyword",
                              ignore_above: 256
                            }
                          }
                        },
                        children: {
                          type: "text",
                          fields: {
                            keyword: {
                              type: "keyword",
                              ignore_above: 256
                            }
                          }
                        },
                        parent: {
                          type: "text",
                          fields: {
                            keyword: {
                              type: "keyword",
                              ignore_above: 256
                            }
                          }
                        },
                        create_time: { type: "double" }
                      }
                    }
                  }
                }
              }
            }
          }
        });
    }
  }

  /**
   * Generate OSIS pipeline settings for conversation tables
   */
  private _createConversationOsisPipelineConfig(props: OsisPipelineConfigProps): any {
    return {
      version: "2",
      "dynamodb-pipeline": {
        source: {
          dynamodb: {
            acknowledgments: true,
            tables: [
              {
                table_arn: props.conversationTable.tableArn,
                stream: {
                  start_position: "LATEST",
                },
                export: {
                  s3_bucket: props.bucketName,
                  s3_region: props.region,
                },
              },
            ],
            aws: {
              sts_role_arn: props.osisRole.roleArn,
              region: props.region,
            },
          },
        },
        processor: [
          // Step 1: Parse message data as JSON
          {
            parse_json: {
              source: "MessageMap",
              destination: "parsed_message_map"
            }
          },
          // Step 2: Initialize conversation data
          {
            add_entries: {
              entries: [
                {
                  key: "messages",
                  value: []
                }
              ]
            }
          },
          // Step 3: List all messages except system
          {
            map_to_list: {
              source: "parsed_message_map",
              target: "messages",
              exclude_keys: [],
              key_name: "id"
            }
          },
          // Step 4: Remove unnecessary data
          {
            delete_entries: {
              with_keys: [
                "IsLargeMessage",
                "TotalPrice",
                "ShouldContinue",
                "LastMessageId",
                "MessageMap",
                "parsed_message_map",
              ]
            }
          }
        ],
        sink: [
          {
            opensearch: {
              hosts: [props.endpoint],
              index: `${props.envPrefix}conversation`,
              index_type: "custom",
              template_type: "index-template", 
              template_content: this._genConversationTemplateContent(props.language),
              document_id: '${getMetadata("primary_key")}',
              action: '${getMetadata("opensearch_action")}',
              document_version: '${getMetadata("document_version")}',
              document_version_type: "external",
              aws: {
                sts_role_arn: props.osisRole.roleArn,
                region: props.region,
                serverless: true,
              },
            },
          },
        ],
      },
    };
  }
}
