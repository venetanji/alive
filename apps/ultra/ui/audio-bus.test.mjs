import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  MAX_AUDIO_CHANNELS, createAudioBus, monoBus, stereoBus, discreteBus,
  ambisonicBus, circularBus, sameAudioBusFormat, assertBusConnection,
  describeJoin, describeSplit, describeChannelMap, NATIVE_STEREO_ADAPTER,
} from './audio-bus.mjs';

const ambiLayout = (order = 1, normalization = 'SN3D') => ({
  kind: 'ambisonic', order, dimensions: '3D', ordering: 'ACN', normalization,
});
const circularLayout = (order = 1) => ({
  kind: 'ambisonic', order, dimensions: '2D', ordering: 'W-SIN-COS', normalization: 'UNIT',
});

test('all audio ports describe a bus, including one-channel mono', () => {
  assert.equal(MAX_AUDIO_CHANNELS, 64);
  assert.deepEqual(monoBus(), {channels: 1, layout: {kind: 'mono'}});
  assert.deepEqual(stereoBus(), {channels: 2, layout: {kind: 'stereo'}});
  for (const channels of [1, 2, 4, 16, 64]) {
    assert.deepEqual(discreteBus(channels), {channels, layout: {kind: 'discrete'}});
  }
});

test('constructor clones and deeply freezes JSON-serializable metadata only', () => {
  const input = {channels: 4, layout: ambiLayout()};
  const bus = createAudioBus(input);
  assert.notEqual(bus, input);
  assert.notEqual(bus.layout, input.layout);
  input.layout.order = 7;
  assert.equal(bus.layout.order, 1);
  assert.ok(Object.isFrozen(bus));
  assert.ok(Object.isFrozen(bus.layout));
  assert.throws(() => { bus.channels = 2; }, TypeError);
  assert.throws(() => { bus.layout.normalization = 'N3D'; }, TypeError);
  assert.deepEqual(createAudioBus(JSON.parse(JSON.stringify(bus))), bus);
});

test('channel counts must be integers in the bounded 1–64 range', () => {
  for (const channels of [0, -1, 65, 2.5, NaN, Infinity, '2', null, undefined]) {
    assert.throws(() => createAudioBus({channels, layout: {kind: 'discrete'}}), /channels/i);
  }
});

test('mono and stereo layouts reject contradictory channel counts', () => {
  assert.throws(() => createAudioBus({channels: 2, layout: {kind: 'mono'}}), /mono/i);
  assert.throws(() => createAudioBus({channels: 1, layout: {kind: 'stereo'}}), /stereo/i);
  assert.throws(() => createAudioBus({channels: 4, layout: {kind: 'stereo'}}), /stereo/i);
});

test('bus and layout shapes reject missing, unknown and non-data properties', () => {
  for (const value of [
    null, [], 'stereo', {}, {channels: 2}, {layout: {kind: 'stereo'}},
    {channels: 2, layout: 'stereo'},
    {channels: 2, layout: {kind: 'surround'}},
    {channels: 2, layout: {kind: 'stereo', order: 1}},
    {channels: 2, layout: {kind: 'stereo', channels: ['R', 'L']}},
    {channels: 2, layout: {kind: 'stereo'}, samples: [0, 0]},
    Object.assign(Object.create({channels: 2}), {layout: {kind: 'stereo'}}),
  ]) assert.throws(() => createAudioBus(value), TypeError);
  const accessor = {channels: 2, get layout() { throw Error('must not invoke getter'); }};
  assert.throws(() => createAudioBus(accessor), TypeError);
});

test('full 3D ambisonic orders derive exactly (order + 1) squared channels', () => {
  for (let order = 0; order <= 7; order++) {
    for (const normalization of ['SN3D', 'N3D']) {
      assert.deepEqual(ambisonicBus(order, normalization), {
        channels: (order + 1) ** 2, layout: ambiLayout(order, normalization),
      });
    }
  }
  assert.equal(ambisonicBus(1).layout.normalization, 'SN3D');
});

test('ambisonic validation rejects incomplete fields and contradictory conventions', () => {
  for (const order of [-1, 1.5, 8, '1', null, NaN]) {
    assert.throws(() => ambisonicBus(order), /order/i);
  }
  for (const layout of [
    {kind: 'ambisonic', order: 1},
    {...ambiLayout(), dimensions: '2D'},
    {...ambiLayout(), ordering: 'FuMa'},
    {...ambiLayout(), normalization: 'maxN'},
    {...ambiLayout(), normalization: undefined},
    {...ambiLayout(), speakers: ['W', 'Y', 'Z', 'X']},
  ]) assert.throws(() => createAudioBus({channels: 4, layout}));
  for (const channels of [1, 2, 3, 5, 16]) {
    assert.throws(() => createAudioBus({channels, layout: ambiLayout(1)}), /channels/i);
  }
});

test('circular 2D metadata matches the measured Faust unit circular basis', () => {
  for (let order = 0; order <= 31; order++) {
    const bus = circularBus(order);
    assert.deepEqual(bus, {channels: 2 * order + 1, layout: circularLayout(order)});
    assert.deepEqual(createAudioBus(JSON.parse(JSON.stringify(bus))), bus);
    assert.ok(Object.isFrozen(bus));
    assert.ok(Object.isFrozen(bus.layout));
  }
  assert.equal(circularBus(31).channels, 63);
  const input = {channels: 3, layout: circularLayout()};
  const bus = createAudioBus(input);
  input.layout.order = 3;
  assert.equal(bus.layout.order, 1);
  assert.throws(() => { bus.layout.order = 3; }, TypeError);
});

test('circular profiles reject bad orders, counts and mixed 2D/3D conventions', () => {
  for (const order of [-1, 0.5, 32, '1', null, undefined, NaN, Infinity]) {
    assert.throws(() => circularBus(order), /order/i);
  }
  for (const channels of [1, 2, 4, 9, 64]) {
    assert.throws(() => createAudioBus({channels, layout: circularLayout(1)}), /channels/i);
  }
  for (const layout of [
    {...circularLayout(), dimensions: '3D'},
    {...circularLayout(), dimensions: '4D'},
    {...circularLayout(), ordering: 'ACN'},
    {...circularLayout(), normalization: 'SN3D'},
    {...circularLayout(), normalization: 'N3D'},
    {...circularLayout(), normalization: 'unit-amplitude'},
    {...ambiLayout(), ordering: 'W-SIN-COS'},
    {...ambiLayout(), normalization: 'UNIT'},
  ]) assert.throws(() => createAudioBus({channels: 3, layout}));
});

test('circular fields never connect implicitly to 3D, discrete or mono even at equal width', () => {
  assert.equal(assertBusConnection(circularBus(4), circularBus(4)), true);
  for (const [source, target] of [
    [circularBus(0), monoBus()],
    [circularBus(0), ambisonicBus(0)],
    [circularBus(4), ambisonicBus(2)],
    [circularBus(4), ambisonicBus(2, 'N3D')],
    [circularBus(1), discreteBus(3)],
    [circularBus(1), circularBus(2)],
  ]) {
    assert.equal(sameAudioBusFormat(source, target), false);
    assert.throws(() => assertBusConnection(source, target), /explicit/i);
  }
});

test('circular routing metadata cannot act as an encoder, decoder or 3D conversion', () => {
  const circular = circularBus(1);
  assert.throws(() => describeJoin([monoBus(), stereoBus()], circular), /ambisonic/i);
  assert.throws(() => describeJoin([circular], discreteBus(3)), /ambisonic/i);
  assert.throws(() => describeSplit(circular, [monoBus(), stereoBus()]), /ambisonic/i);
  assert.throws(() => describeSplit(discreteBus(3), [circular]), /ambisonic/i);
  assert.throws(() => describeChannelMap(circular, stereoBus(), [0, 1]), /ambisonic/i);
  assert.throws(() => describeChannelMap(discreteBus(3), circular, [0, 1, 2]), /ambisonic/i);
  assert.throws(() => describeChannelMap(circular, circular, [0, 2, 1]), /ambisonic/i);
  const identity9 = Array.from({length: 9}, (_, index) => index);
  assert.throws(() => describeChannelMap(circularBus(4), ambisonicBus(2), identity9), /ambisonic/i);
  assert.throws(() => describeChannelMap(ambisonicBus(2), circularBus(4), identity9), /ambisonic/i);
  assert.deepEqual(describeChannelMap(circular, circular, [0, 1, 2]).output, circular);
});

test('direct connections require exact count AND semantic layout', () => {
  assert.equal(sameAudioBusFormat(stereoBus(), stereoBus()), true);
  assert.equal(assertBusConnection(ambisonicBus(3), ambisonicBus(3)), true);
  for (const [source, target] of [
    [monoBus(), stereoBus()], [stereoBus(), discreteBus(2)],
    [monoBus(), ambisonicBus(0)], [discreteBus(4), ambisonicBus(1)],
    [ambisonicBus(1), ambisonicBus(1, 'N3D')],
    [ambisonicBus(1), ambisonicBus(2)],
  ]) {
    assert.equal(sameAudioBusFormat(source, target), false);
    assert.throws(() => assertBusConnection(source, target), /explicit/i);
  }
  assert.throws(() => sameAudioBusFormat({channels: 2}, stereoBus()));
});

test('joining mono A/B into stereo is an explicit ordered operation, not summing', () => {
  const plan = describeJoin([monoBus(), monoBus()], stereoBus());
  assert.deepEqual(plan, {
    kind: 'join', inputs: [monoBus(), monoBus()], output: stereoBus(),
    channelMap: [{input: 0, channel: 0}, {input: 1, channel: 0}],
  });
  assert.ok(Object.isFrozen(plan));
  assert.ok(Object.isFrozen(plan.inputs));
  assert.ok(Object.isFrozen(plan.channelMap[0]));
  assert.deepEqual(describeJoin([stereoBus(), discreteBus(2)], discreteBus(4)).channelMap,
    [{input: 0, channel: 0}, {input: 0, channel: 1}, {input: 1, channel: 0}, {input: 1, channel: 1}]);
});

test('joining never drops, duplicates or zero-pads undeclared channels', () => {
  assert.throws(() => describeJoin([], stereoBus()), /inputs/i);
  assert.throws(() => describeJoin([monoBus()], stereoBus()), /channel/i);
  assert.throws(() => describeJoin([stereoBus(), monoBus()], stereoBus()), /channel/i);
  assert.throws(() => describeJoin([discreteBus(64), monoBus()], discreteBus(64)), /channel/i);
  assert.throws(() => describeJoin(new Array(2), stereoBus()), /bus/i);
});

test('splitting exhaustively partitions channels, preserving their order', () => {
  const plan = describeSplit(discreteBus(4), [monoBus(), stereoBus(), monoBus()]);
  assert.deepEqual(plan.channelMap, [[0], [1, 2], [3]]);
  assert.deepEqual(plan.outputs, [monoBus(), stereoBus(), monoBus()]);
  assert.ok(Object.isFrozen(plan.channelMap[1]));
  assert.throws(() => describeSplit(stereoBus(), [monoBus()]), /channel/i);
  assert.throws(() => describeSplit(stereoBus(), [stereoBus(), monoBus()]), /channel/i);
  assert.throws(() => describeSplit(stereoBus(), []), /outputs/i);
});

test('explicit maps describe selections, reorders and duplication, never a mix', () => {
  assert.deepEqual(describeChannelMap(stereoBus(), stereoBus(), [1, 0]), {
    kind: 'map', input: stereoBus(), output: stereoBus(), channels: [1, 0],
  });
  assert.deepEqual(describeChannelMap(monoBus(), stereoBus(), [0, 0]).channels, [0, 0]);
  assert.deepEqual(describeChannelMap(stereoBus(), monoBus(), [1]).channels, [1]);
  const channels = [1, 0];
  const plan = describeChannelMap(stereoBus(), discreteBus(2), channels);
  channels[0] = 0;
  assert.deepEqual(plan.channels, [1, 0]);
  assert.ok(Object.isFrozen(plan.channels));
  for (const map of [[], [0], [0, 1, 0], [0, 2], [0, -1], [0, 0.5], ['0', 1], [0, null], [[0, 1], 1], new Array(2)]) {
    assert.throws(() => describeChannelMap(stereoBus(), stereoBus(), map), /channel/i);
  }
});

test('routing descriptors cannot masquerade as ambisonic encoders or decoders', () => {
  const ambi = ambisonicBus(1);
  assert.throws(() => describeJoin([stereoBus(), stereoBus()], ambi), /ambisonic/i);
  assert.throws(() => describeJoin([ambi], discreteBus(4)), /ambisonic/i);
  assert.throws(() => describeSplit(ambi, [stereoBus(), stereoBus()]), /ambisonic/i);
  assert.throws(() => describeSplit(discreteBus(4), [ambi]), /ambisonic/i);
  assert.throws(() => describeChannelMap(ambi, stereoBus(), [0, 1]), /ambisonic/i);
  assert.throws(() => describeChannelMap(discreteBus(4), ambi, [0, 1, 2, 3]), /ambisonic/i);
  assert.throws(() => describeChannelMap(ambi, ambisonicBus(1, 'N3D'), [0, 1, 2, 3]), /ambisonic/i);
  assert.throws(() => describeChannelMap(ambi, ambi, [0, 2, 1, 3]), /ambisonic/i);
  assert.deepEqual(describeChannelMap(ambi, ambi, [0, 1, 2, 3]).output, ambi);
});

test('native adapter distinguishes logical devices from stereo channels and DSP capability', () => {
  const adapter = NATIVE_STEREO_ADAPTER;
  assert.equal(adapter.id, 'ultra-native-stereo-v1');
  assert.deepEqual(adapter.logicalDevices, [
    {device: 0, label: 'A', bus: monoBus()},
    {device: 1, label: 'B', bus: monoBus()},
  ]);
  assert.deepEqual(adapter.pack, describeJoin([monoBus(), monoBus()], stereoBus()));
  assert.deepEqual(adapter.output, stereoBus());
  assert.equal(adapter.outputChannels, 2);
  assert.deepEqual(adapter.hardwareMap, [
    {channel: 0, label: 'L', device: 0},
    {channel: 1, label: 'R', device: 1},
  ]);
  assert.equal(adapter.ambisonicDSP, false);
  assert.ok(Object.isFrozen(adapter.logicalDevices[0].bus.layout));
  assert.ok(Object.isFrozen(adapter.hardwareMap[0]));
});
