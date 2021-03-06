const fs = require('fs-extra');
const path = require('path');
const constants = require('./constants');
const pintpointHelper = require('./pinpoint-helper');

const channelWorkers = {
  APNS: './channel-APNS',
  FCM: './channel-FCM',
  Email: './channel-Email',
  SMS: './channel-SMS',
};

function getAvailableChannels() {
  return Object.keys(channelWorkers);
}

function getEnabledChannels(context) {
  const result = [];
  const { amplifyMeta } = context.exeInfo;
  const availableChannels = getAvailableChannels(context);
  const categoryMeta = amplifyMeta[constants.CategoryName];
  if (categoryMeta) {
    const services = Object.keys(categoryMeta);
    for (let i = 0; i < services.length; i++) {
      const serviceMeta = categoryMeta[services[i]];
      if (serviceMeta.service === 'Pinpoint' &&
                                serviceMeta.output &&
                                serviceMeta.output.Id) {
        availableChannels.forEach((channel) => {
          if (serviceMeta.output[channel] && serviceMeta.output[channel].Enabled) {
            result.push(channel);
          }
        });
        break;
      }
    }
  }
  return result;
}

function getDisabledChannels(context) {
  const result = [];
  const availableChannels = getAvailableChannels(context);
  const enabledChannels = getEnabledChannels(context);
  availableChannels.forEach((channel) => {
    if (!enabledChannels.includes(channel)) {
      result.push(channel);
    }
  });

  return result;
}

async function enableChannel(context, channelName) {
  if (Object.keys(channelWorkers).indexOf(channelName) > -1) {
    context.exeInfo.pinpointClient = await pintpointHelper.getPinpointClient(context);
    const channelWorker = require(path.join(__dirname, channelWorkers[channelName]));
    await channelWorker.enable(context);
  }
}

async function disableChannel(context, channelName) {
  if (Object.keys(channelWorkers).indexOf(channelName) > -1) {
    context.exeInfo.pinpointClient = await pintpointHelper.getPinpointClient(context);
    const channelWorker = require(path.join(__dirname, channelWorkers[channelName]));
    await channelWorker.disable(context);
  }
}

async function configureChannel(context, channelName) {
  if (Object.keys(channelWorkers).indexOf(channelName) > -1) {
    context.exeInfo.pinpointClient = await pintpointHelper.getPinpointClient(context);
    const channelWorker = require(path.join(__dirname, channelWorkers[channelName]));
    await channelWorker.configure(context);
  }
}

function updateaServiceMeta(context) {
  const amplifyMetaFilePath = context.amplify.pathManager.getAmplifyMetaFilePath();
  if (context.exeInfo && context.exeInfo.serviceMeta) {
    context.exeInfo.serviceMeta.lastPushTimeStamp = new Date();
  }
  let jsonString = JSON.stringify(context.exeInfo.amplifyMeta, null, '\t');
  fs.writeFileSync(amplifyMetaFilePath, jsonString, 'utf8');

  const currentAmplifyMetaFilePath = context.amplify.pathManager.getCurentAmplifyMetaFilePath();
  const currentAmplifyMeta = JSON.parse(fs.readFileSync(currentAmplifyMetaFilePath));
  currentAmplifyMeta[constants.CategoryName] = context.exeInfo.amplifyMeta[constants.CategoryName];
  jsonString = JSON.stringify(currentAmplifyMeta, null, '\t');
  fs.writeFileSync(currentAmplifyMetaFilePath, jsonString, 'utf8');

  context.amplify.onCategoryOutputsChange(context);
}

module.exports = {
  getAvailableChannels,
  getEnabledChannels,
  getDisabledChannels,
  enableChannel,
  disableChannel,
  configureChannel,
  updateaServiceMeta,
};
