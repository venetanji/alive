import test from 'node:test';
import assert from 'node:assert/strict';
import {analogParameterDisplay,formatAnalogParameterValue} from './analog-parameter-display.mjs';

const chain=property=>`SignalChain1.${property}`;
const envelope=property=>chain(`Envelope[0].${property}`);
const close=(actual,expected,tolerance=1e-6)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);

test('uses host physical tables for frequency, levels and envelope time',()=>{
  for(const [key,raw,want] of [
    [chain('FilterCutoffFrequency'),0,30],[chain('FilterCutoffFrequency'),.5,833.7823486328125],
    [chain('FilterCutoffFrequency'),1,22000.001953125],[chain('OscillatorLevel'),.5,-15.033716201782227],
    [chain('AmplifierLevel'),.5,-16.808536529541016],['Volume',.5,-6.020599842071533],
    [envelope('AttackTime'),.5,.2826310098171234],[envelope('DecayTime'),0,.004999999888241291],
    [envelope('ReleaseTime'),1,15.000001907348633],[chain('LFOSpeed'),.5,.9339889883995056],
    ['NoiseColor',.5,681.8681640625],['KeyboardFineTune',.5,0],
  ])close(analogParameterDisplay(key).toDisplay(raw),want);
});

test('interpolates around the host center and inverts each segment',()=>{
  const display=analogParameterDisplay(chain('FilterCutoffFrequency'));
  close(display.toDisplay(.25),158.15647888183594);
  close(display.toDisplay(.5+1/126),878.2417602539062);
  close(display.toDisplay(.5+.5/126),856.0120544433594);
  for(const key of ['Volume',chain('OscillatorLevel'),chain('AmplifierLevel'),chain('FilterCutoffFrequency'),chain('LFOSpeed'),envelope('AttackTime'),envelope('SustainTime')]){
    const adapter=analogParameterDisplay(key);
    for(const raw of [0,.001,.12,.25,.499,.5,.501,.84,1])close(adapter.fromDisplay(adapter.toDisplay(raw)),raw,1e-10);
  }
});

test('uses the signed square oscillator detune instead of a linear pitch guess',()=>{
  const display=analogParameterDisplay(chain('OscillatorDetune'));
  for(const [raw,want] of [[0,-3],[.25,-.75],[.5,0],[.75,.75],[1,3]]){
    close(display.toDisplay(raw),want);close(display.fromDisplay(want),raw);
  }
  close(analogParameterDisplay('KeyboardFineTune').toDisplay(0),-.5);
  close(analogParameterDisplay('PitchBendRange').toDisplay(.5),6);
  close(analogParameterDisplay(chain('OscillatorOct')).toDisplay(-3),-3);
  close(analogParameterDisplay(chain('OscillatorSemi')).parse('-12 st'),-12);
});

test('parses physical units and rejects unsupported units and out of range input',()=>{
  const frequency=analogParameterDisplay(chain('FilterCutoffFrequency'));
  close(frequency.toDisplay(frequency.parse('1.25 kHz')),1250);
  const time=analogParameterDisplay(envelope('AttackTime'));
  close(time.toDisplay(time.parse('500 ms')),.5);
  close(time.toDisplay(time.parse('2 s')),2);
  close(analogParameterDisplay(chain('OscillatorPulseWidth')).parse('25 %'),.25);
  close(analogParameterDisplay(chain('OscillatorDetune')).parse('75 cents'),.75);
  for(const input of ['', 'NaN','1 ms','25 Hz','23000 Hz','1 kHzjunk'])assert.ok(Number.isNaN(frequency.parse(input)),input);
});

test('formats the application units, mute, infinite sustain and stereo position',()=>{
  assert.equal(formatAnalogParameterValue(chain('FilterCutoffFrequency'),.5),'834 Hz');
  assert.equal(formatAnalogParameterValue(envelope('AttackTime'),0),'5 ms');
  assert.equal(formatAnalogParameterValue(envelope('AttackTime'),.5),'283 ms');
  assert.equal(formatAnalogParameterValue('Volume',0),'-inf dB');
  assert.equal(formatAnalogParameterValue(envelope('SustainTime'),1),'inf s');
  assert.equal(formatAnalogParameterValue(chain('AmplifierPan'),0),'50L');
  assert.equal(formatAnalogParameterValue(chain('AmplifierPan'),.5),'C');
  assert.equal(formatAnalogParameterValue(chain('AmplifierPan'),1),'50R');
  close(analogParameterDisplay('Volume').parse('-inf dB'),0);
  close(analogParameterDisplay(envelope('SustainTime')).parse('inf s'),1);
  for(const [text,want] of [['50L',0],['C',.5],['25R',.75]])close(analogParameterDisplay(chain('AmplifierPan')).parse(text),want);
  for(const key of ['Volume',chain('AmplifierPan'),chain('FilterCutoffFrequency'),envelope('SustainTime')]){
    const display=analogParameterDisplay(key);
    for(const raw of [0,.25,.5,.75,1])assert.ok(Number.isFinite(display.parse(display.format(raw))),`${key} ${raw}`);
  }
});

test('formats oscillator filter routing with the observed F1/F2 balance',()=>{
  const display=analogParameterDisplay(chain('OscillatorBalance'));
  assert.equal(display.format(0),'F2');assert.equal(display.format(1),'F1');assert.equal(display.format(.25),'25/75');
  close(display.parse('25/75'),.25);close(display.parse('F1'),1);close(display.parse('F2'),0);
});

test('does not attach physical units to an unverified parameter',()=>{
  assert.equal(analogParameterDisplay('not.a.parameter'),null);
  assert.equal(analogParameterDisplay(chain('FilterType')),null);
});

test('uses the host chooser order for waveform, drive, loop and keyboard labels',()=>{
  for(const [key,labels] of [
    [chain('OscillatorWaveShape'),['Sine','Saw','Rect','Noise']],
    [chain('OscillatorMode'),['Sub','Sync']],
    [chain('FilterDrive'),['Off','Sym1','Sym2','Sym3','Asym1','Asym2','Asym3']],
    [chain('LFOWaveShape'),['Sine','Tri','Rect','Noise1','Noise2']],
    [envelope('Loop'),['Off','AD-R','ADR-R','ADS-AR']],
    ['KeyboardPriority',['High','Low','Last']],['PortamentoMode',['Prop','Const']],
  ]){
    const display=analogParameterDisplay(key);assert.ok(display,key);
    assert.deepEqual(display.options,labels.map((label,value)=>({value,label})));
    for(const [value,label] of labels.entries()){
      assert.equal(display.format(value),label);assert.equal(display.parse(label),value);
    }
    assert.ok(Number.isNaN(display.parse('unknown')));assert.ok(Number.isNaN(display.parse('0.5')));
  }
});

test('shows signed oscillator initial pitch envelope as the host percentage',()=>{
  const display=analogParameterDisplay(chain('OscillatorEnvAmount'));assert.ok(display);
  assert.equal(display.format(-.5),'-50 %');assert.equal(display.parse('-50 %'),-.5);
  assert.equal(display.format(1),'100 %');assert.equal(display.format(-1),'-100 %');
});
