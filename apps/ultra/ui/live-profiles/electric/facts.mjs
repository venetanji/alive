// Authored descriptor identities retained in Electric r5, not defaults or readback.
export const electricIdentity = Object.freeze({
  device: 'Electric', version: 1, profile: 'live12-electric-v1',
  dllSha256: '66a42b09161ca7d48861e1980523e2cb44dd4f08fbd04ac9c4231a56d79b2be8',
  guiSha256: '75940fa314699a5fe0f37a6b0ee904bd7cc2ee87fc42acce2c8cea61df55563f',
  graphicsSha256: 'ec6ed560b42b1497fd976beff38d86424aa0c2ef59e4995e3d10ba9b68535c9d',
  entrypoint: 'Devices/LoungeLizard/Contents.xml',
});

export const electricNativeDescriptors = Object.freeze([
  Object.freeze([601,1,2,0.0,30.0]),
  Object.freeze([605,0,2,0.0,1.0]),
  Object.freeze([619,1,0,0.0,1.0]),
  Object.freeze([605,2,2,0.0,1.0]),
  Object.freeze([613,1,0,0.0,1.0]),
  Object.freeze([613,4,0,0.0,1.0]),
  Object.freeze([613,5,0,0.0,1.0]),
  Object.freeze([613,2,0,0.0,1.0]),
  Object.freeze([603,1,0,0.0,1.0]),
  Object.freeze([604,1,0,0.0,1.0]),
  Object.freeze([615,20,0,0.0,1.0]),
  Object.freeze([615,23,0,0.0,1.0]),
  Object.freeze([615,21,0,0.0,1.0]),
  Object.freeze([615,24,0,0.0,1.0]),
  Object.freeze([615,37,0,0.0,1.0]),
  Object.freeze([615,13,0,0.0,1.0]),
  Object.freeze([615,11,0,0.0,1.0]),
  Object.freeze([615,17,0,0.0,1.0]),
  Object.freeze([615,14,0,0.0,1.0]),
  Object.freeze([615,3,0,0.0,1.0]),
  Object.freeze([615,1,0,0.0,1.0]),
  Object.freeze([616,1,0,0.0,1.0]),
  Object.freeze([616,2,0,0.0,1.0]),
  Object.freeze([616,11,3,0.0,1.0]),
  Object.freeze([616,3,0,0.0,1.0]),
  Object.freeze([616,7,0,0.0,1.0]),
  Object.freeze([616,8,0,0.0,1.0]),
  Object.freeze([614,1,0,0.0,1.0]),
  Object.freeze([614,2,0,0.0,1.0]),
  Object.freeze([614,3,0,0.0,1.0]),
  Object.freeze([0,0,1,0.0,24.0]),
  Object.freeze([606,1,0,0.0,1.0]),
  Object.freeze([605,1,2,0.0,48.0]),

]);
export const electricDescriptors = Object.freeze(electricNativeDescriptors.map(
  ([module, property, kind, min, max], index) => Object.freeze({index, module, property, kind, min, max}),
));
