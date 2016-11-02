'use strict';

var chai = require('chai');
global.expect = chai
  .use(require('chai-as-promised'))
  .use(require('dirty-chai'))
  .use(require('sinon-chai'))
  .expect;

global.should = chai.should();

global.sinon = require('sinon');
require('sinon-as-promised')(require('q').Promise);
global.sandbox = sinon.sandbox.create();
