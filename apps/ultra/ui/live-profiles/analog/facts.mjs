import {analogNativeDescriptors} from '../../analog-native-descriptors.mjs';

export const analogIdentity = Object.freeze({
  device: 'Analog', version: 1, profile: 'live12-analog-v1',
  dllSha256: '4528afb1fbc78d49ed92161ed13ae1df50606e2e2b2c4f28caeca0cbc1476133',
  guiSha256: '75940fa314699a5fe0f37a6b0ee904bd7cc2ee87fc42acce2c8cea61df55563f',
  graphicsSha256: 'ec6ed560b42b1497fd976beff38d86424aa0c2ef59e4995e3d10ba9b68535c9d',
  entrypoint: 'Devices/UltraAnalog/Contents.xml',
});

// Descriptor auxiliary floats are not established defaults or native readback.
export const analogDescriptors = Object.freeze(analogNativeDescriptors.map(
  ([module, property, kind, min, max], index) => Object.freeze({index, module, property, kind, min, max})));

export const analogQualification = Object.freeze({
  packetRevision: 1,
  packetSha256: '3c70168eba0e0338dcf4c1b7d0bdfa90a99f5c3d8293cc0980a7ef7dd8e5e49b',
  modelNativeBridge: 'historical-mapping',
  physicalDisplay: 'historical-mapping',
  currentStaticPacketRevision: 2,
  currentStaticPacketSha256: 'f5ec6579cfbaf6203bfb1b9ac7e5e16be79055b356a109911d003a216b45730a',
  currentStaticMappedModelFields: 175,
  currentStaticMappedNativeSlots: 203,
  savedPresetMappedModelFields: 170,
  savedPresetMappedNativeSlots: 198,
  completeInitialization: false,
  completeEditor: false,
  alive: false,
});
