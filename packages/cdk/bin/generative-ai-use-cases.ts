#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getParams } from '../parameter';
import { createStacks } from '../lib/create-stacks';

const app = new cdk.App();
const params = getParams(app);
createStacks(app, params);
