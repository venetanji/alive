/**
 * Control-layer audio-port contract. A bus describes one cable containing N
 * synchronous channels, including N=1. It contains NO live samples or buffer
 * pointers. The native audio thread owns sample storage and processing.
 *
 * Inspiration, not Max MC compatibility:
 * https://docs.cycling74.com/userguide/mc/mc_signals_newobjects/
 * Unlike Max's permissive unpack/resize behavior, direct connections here never
 * pad, drop, duplicate, mix, reinterpret a layout, or change normalization.
 *
 * Full 3D ambisonics has (order+1)^2 coefficients in ACN order. SN3D and N3D
 * are different formats; metadata cannot convert their samples:
 * https://www.rfc-editor.org/rfc/rfc8486.html#section-3.1
 * https://plugins.iem.at/docs/compatibility/
 *
 * Circular 2D uses the pinned Faust HOA profile measured in
 * experiments/faust-hoa/README.md: 2N+1 coefficients [W,sin1,cos1,...].
 * W-SIN-COS/UNIT means H0=x, H[2n-1]=x*sin(n*a), H[2n]=x*cos(n*a).
 * Azimuth a is radians, zero toward +X, positive toward +Y; each pair has
 * unit amplitude, with no extra scaling. It is NOT 3D ACN/SN3D or N3D:
 * https://faustlibraries.grame.fr/libs/hoa/
 * The pinned raw Faust 3D encoder is antipodal: (-1)^degree versus conventional
 * ACN/SN3D (+X front, +Y left, +Z up, positive elevation toward +Z).
 * Only the measured odd-degree sign wrapper may use our conventional 3D
 * profile. Relabeling raw samples is not that conversion; rerun the probe
 * after library upgrades. These descriptors do not integrate any HOA DSP.
 *
 * @typedef {{kind: 'mono'|'stereo'|'discrete'} |
 *   {kind: 'ambisonic', order: number, dimensions: '3D', ordering: 'ACN',
 *    normalization: 'SN3D'|'N3D'} |
 *   {kind: 'ambisonic', order: number, dimensions: '2D', ordering: 'W-SIN-COS',
 *    normalization: 'UNIT'}} AudioLayout
 * @typedef {Readonly<{channels: number, layout: Readonly<AudioLayout>}>} AudioBus
 *
 * All indices in routing descriptors are ZERO-BASED. Stereo means [L,R].
 * Discrete channels have no implied speaker positions. Ambisonic channels are
 * sound-field coefficients, never speaker feeds. Mixed-order fields are not
 * supported. 64 channels is this contract's bound, not a Max/Faust/DSP limit.
 */
export const MAX_AUDIO_CHANNELS = 64;

function exactDataKeys(value, keys, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw TypeError(`${name} must be a plain data object.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== keys.length ||
      keys.some(key => !Object.hasOwn(descriptors, key) || !Object.hasOwn(descriptors[key], 'value'))) {
    throw TypeError(`${name} must contain exactly: ${keys.join(', ')}.`);
  }
}

function deepFreeze(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') deepFreeze(child);
  }
  return Object.freeze(value);
}

function ambisonicChannels(order) {
  if (!Number.isInteger(order) || order < 0 || order > 7) {
    throw RangeError('Ambisonic order must be an integer from 0 to 7 (at most 64 channels).');
  }
  return (order + 1) ** 2;
}

function circularChannels(order) {
  if (!Number.isInteger(order) || order < 0 || order > 31) {
    throw RangeError('Circular ambisonic order must be an integer from 0 to 31 (at most 63 channels).');
  }
  return 2 * order + 1;
}

/** Validate, copy and freeze a complete JSON-safe AudioBus. No inference. */
export function createAudioBus(value) {
  exactDataKeys(value, ['channels', 'layout'], 'Audio bus');
  const {channels, layout} = value;
  if (!Number.isInteger(channels) || channels < 1 || channels > MAX_AUDIO_CHANNELS) {
    throw RangeError('Audio bus channels must be an integer from 1 to 64.');
  }
  // Validate kind without invoking a getter or accepting inherited properties.
  const kind = layout && Object.getOwnPropertyDescriptor(layout, 'kind')?.value;
  if (!['mono', 'stereo', 'discrete', 'ambisonic'].includes(kind)) {
    throw TypeError('Unknown audio bus layout kind.');
  }
  exactDataKeys(layout, kind === 'ambisonic'
    ? ['kind', 'order', 'dimensions', 'ordering', 'normalization'] : ['kind'], 'Audio bus layout');
  if ((kind === 'mono' && channels !== 1) || (kind === 'stereo' && channels !== 2)) {
    throw RangeError(`${kind} layout requires ${kind === 'mono' ? 1 : 2} channels.`);
  }
  if (kind === 'ambisonic') {
    if (layout.dimensions === '2D') {
      if (layout.ordering !== 'W-SIN-COS' || layout.normalization !== 'UNIT') {
        throw TypeError('Circular ambisonic layout requires 2D, W-SIN-COS, and UNIT normalization.');
      }
      if (channels !== circularChannels(layout.order)) {
        throw RangeError('Circular ambisonic channels must equal 2 * order + 1.');
      }
    } else if (layout.dimensions === '3D') {
      if (layout.ordering !== 'ACN' || !['SN3D', 'N3D'].includes(layout.normalization)) {
        throw TypeError('Spherical ambisonic layout requires 3D, ACN, and explicit SN3D or N3D normalization.');
      }
      if (channels !== ambisonicChannels(layout.order)) {
        throw RangeError('Spherical ambisonic channels must equal (order + 1) squared.');
      }
    } else {
      throw TypeError('Ambisonic dimensions must be explicitly 2D or 3D.');
    }
    return deepFreeze({channels, layout: {
      kind, order: layout.order, dimensions: layout.dimensions,
      ordering: layout.ordering, normalization: layout.normalization,
    }});
  }
  return deepFreeze({channels, layout: {kind}});
}

export const monoBus = () => createAudioBus({channels: 1, layout: {kind: 'mono'}});
export const stereoBus = () => createAudioBus({channels: 2, layout: {kind: 'stereo'}});
export const discreteBus = channels => createAudioBus({channels, layout: {kind: 'discrete'}});
export const ambisonicBus = (order, normalization = 'SN3D') => createAudioBus({
  channels: ambisonicChannels(order),
  layout: {kind: 'ambisonic', order, dimensions: '3D', ordering: 'ACN', normalization},
});
export const circularBus = order => createAudioBus({
  channels: circularChannels(order),
  layout: {kind: 'ambisonic', order, dimensions: '2D', ordering: 'W-SIN-COS', normalization: 'UNIT'},
});

/** Invalid data throws; valid but unequal formats return false. */
export function sameAudioBusFormat(source, target) {
  return JSON.stringify(createAudioBus(source)) === JSON.stringify(createAudioBus(target));
}

/** Validate a direct cable. Equal channel count alone is insufficient. */
export function assertBusConnection(source, target) {
  if (!sameAudioBusFormat(source, target)) {
    throw TypeError('Audio bus formats differ. Use an explicit routing or DSP conversion object.');
  }
  return true;
}

function busList(values, name) {
  if (!Array.isArray(values) || values.length < 1 || values.length > MAX_AUDIO_CHANNELS) {
    throw TypeError(`${name} must contain 1–64 audio buses.`);
  }
  // Array.from intentionally visits holes, which must fail validation.
  return Array.from(values, createAudioBus);
}

function rejectAmbisonicRouting(buses) {
  if (buses.some(bus => bus.layout.kind === 'ambisonic')) {
    throw TypeError('Ambisonic field manipulation requires dedicated DSP, not a routing descriptor.');
  }
}

/**
 * Concatenate complete input buses in order. Output layout is explicitly chosen,
 * never inferred as stereo merely because the result contains two channels.
 * This describes wiring, not processing; it neither sums nor synthesizes.
 */
export function describeJoin(inputs, output) {
  inputs = busList(inputs, 'Join inputs'); output = createAudioBus(output);
  rejectAmbisonicRouting([...inputs, output]);
  if (inputs.reduce((sum, bus) => sum + bus.channels, 0) !== output.channels) {
    throw RangeError('Join output channel count must equal the sum of all input channels.');
  }
  const channelMap = inputs.flatMap((bus, input) =>
    Array.from({length: bus.channels}, (_, channel) => ({input, channel})));
  return deepFreeze({kind: 'join', inputs, output, channelMap});
}

/** Exhaustive contiguous split. No extra channels are ignored or zero-padded. */
export function describeSplit(input, outputs) {
  input = createAudioBus(input); outputs = busList(outputs, 'Split outputs');
  rejectAmbisonicRouting([input, ...outputs]);
  if (outputs.reduce((sum, bus) => sum + bus.channels, 0) !== input.channels) {
    throw RangeError('Split output channel counts must sum to the input channel count.');
  }
  let channel = 0;
  const channelMap = outputs.map(bus => Array.from({length: bus.channels}, () => channel++));
  return deepFreeze({kind: 'split', input, outputs, channelMap});
}

/**
 * An explicit source index for EVERY destination channel. Selection, permutation
 * or duplication is intentional here. No sum, gain, padding, or decoding exists.
 * For ambisonics only an unchanged, same-format identity map is allowed.
 */
export function describeChannelMap(input, output, channels) {
  input = createAudioBus(input); output = createAudioBus(output);
  if (!Array.isArray(channels) || channels.length !== output.channels ||
      Array.from(channels).some(channel => !Number.isInteger(channel) || channel < 0 || channel >= input.channels)) {
    throw RangeError('Channel map needs one valid zero-based source channel per output channel.');
  }
  if ((input.layout.kind === 'ambisonic' || output.layout.kind === 'ambisonic') &&
      (!sameAudioBusFormat(input, output) || channels.some((channel, index) => channel !== index))) {
    throw TypeError('Ambisonic channel conversion requires dedicated DSP, not a channel map.');
  }
  return deepFreeze({kind: 'map', input, output, channels: [...channels]});
}

/**
 * BOUNDED ADAPTER for the existing ultra_core_render(left, right, ...) API.
 * A/B are independent logical instruments, not permanent synonyms for L/R.
 * This current binding packs their mono outputs into one [L,R] cable. It does
 * not enable arbitrary-N native rendering, runtime rerouting, or ambisonics.
 * The extra internal diagnostic stream is not a user audio output channel.
 */
export const NATIVE_STEREO_ADAPTER = deepFreeze({
  id: 'ultra-native-stereo-v1',
  logicalDevices: [
    {device: 0, label: 'A', bus: monoBus()},
    {device: 1, label: 'B', bus: monoBus()},
  ],
  pack: describeJoin([monoBus(), monoBus()], stereoBus()),
  output: stereoBus(),
  outputChannels: 2,
  hardwareMap: [
    {channel: 0, label: 'L', device: 0},
    {channel: 1, label: 'R', device: 1},
  ],
  ambisonicDSP: false,
});
