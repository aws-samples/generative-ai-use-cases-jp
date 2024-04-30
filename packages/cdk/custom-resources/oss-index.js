const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { Client } = require('@opensearch-project/opensearch');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');

const sleep = (msec) => new Promise((resolve) => setTimeout(resolve, msec));

const updateStatus = async (event, status, reason, physicalResourceId) => {
  const body = JSON.stringify({
    Status: status,
    Reason: reason,
    PhysicalResourceId: physicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    NoEcho: false,
    Data: {},
  });

  const res = await fetch(event.ResponseURL, {
    method: 'PUT',
    body,
    headers: {
      'Content-Type': '',
      'Content-Length': body.length.toString(),
    },
  });

  console.log(res);
  console.log(await res.text());
};

exports.handler = async (event, context) => {
  console.log(event);
  console.log(JSON.stringify(event));
  console.log(context);

  const props = event.ResourceProperties;
  console.log(props);

  const collectionId = props.collectionId;
  const region = process.env.AWS_DEFAULT_REGION;
  const client = new Client({
    ...AwsSigv4Signer({
      region,
      service: 'aoss',
      getCredentials: () => {
        const credentialsProvider = defaultProvider();
        return credentialsProvider();
      },
    }),
    node: `https://${collectionId}.${region}.aoss.amazonaws.com`,
  });

  try {
    switch (event.RequestType) {
      case 'Create':
        await client.indices.create({
          index: props.vectorIndexName,
          body: {
            mappings: {
              properties: {
                [props.metadataField]: {
                  type: 'text',
                  index: false,
                },
                [props.textField]: {
                  type: 'text',
                  // analyzer: 'custom_kuromoji_analyzer'
                  analyzer: 'custom_ngram_analyzer',
                },
                [props.vectorField]: {
                  type: 'knn_vector',
                  dimension: 1536,
                  method: {
                    engine: 'faiss',
                    space_type: 'l2',
                    name: 'hnsw',
                    parameters: {},
                  },
                },
              },
            },
            settings: {
              index: {
                knn: true,
                analysis: {
                  analyzer: {
                    // custom_kuromoji_analyzer: {
                    //   tokenizer: 'kuromoji_tokenizer',
                    //   filter: [
                    //     'kuromoji_baseform',
                    //     'ja_stop'
                    //   ],
                    //   char_filter: [
                    //     'icu_normalizer'
                    //   ]
                    // }
                    custom_ngram_analyzer: {
                      type: 'custom',
                      tokenizer: 'custom_ngram_tokenizer',
                      char_filter: ['icu_normalizer', 'html_strip'],
                      filter: ['lowercase', 'ja_stop'],
                    },
                  },
                  tokenizer: {
                    custom_ngram_tokenizer: {
                      type: 'ngram',
                      min_gram: 2,
                      max_gram: 3,
                      token_chars: ['letter', 'digit'],
                    },
                  },
                },
              },
            },
          },
        });
        await sleep(30 * 1000); // sleep 30s to confirm the creation
        await updateStatus(
          event,
          'SUCCESS',
          'Successfully created',
          props.vectorIndexName
        );
        break;
      case 'Update':
        // TODO
        await updateStatus(
          event,
          'SUCCESS',
          'Update operation is not supported',
          props.vectorIndexName
        );
        break;
      case 'Delete':
        const index = event.PhysicalResourceId;
        await client.indices.delete({
          index,
        });
        await updateStatus(event, 'SUCCESS', 'Successfully deleted', index);
        break;
    }
  } catch (e) {
    console.log('---- Error');
    console.log(e);

    const physicalResourceId =
      props.vectorIndexName || event.PhysicalResourceId;
    await updateStatus(event, 'FAILED', e.message, physicalResourceId);
  }
};
