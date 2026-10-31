import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMaster} from './alive-master.mjs';

const observation=()=>({targetGain:.25,currentGain:.3,peakLeft:.8,peakRight:1.2,clipMask:2,appliedSerial:'9007199254740993',appliedFrame:'9007199254740995',observationStartFrame:'9007199254740995',observationEndFrame:'9007199254741059'});
const master=()=>({gain:.5,acceptedSerial:'9007199254740994',available:true,unavailableReason:null,observation:observation(),observationStale:false});

test('valid Master DTO retains separate accepted and applied identities and nullable observation',()=>{
  const value=master();assert.equal(validateMaster(value),value);
  assert.equal(value.acceptedSerial,'9007199254740994');assert.equal(value.observation.appliedSerial,'9007199254740993');
  assert.doesNotThrow(()=>validateMaster({gain:.5,acceptedSerial:'0',available:false,unavailableReason:'Unavailable',observation:null,observationStale:false}));
  value.observationStale=true;assert.doesNotThrow(()=>validateMaster(value));
});

test('invalid Master DTO values are refused rather than coerced',()=>{
  for(const [key,value] of [['gain',NaN],['gain',4.1],['available',1],['unavailableReason',undefined],['observationStale',null],['acceptedSerial','01'],['acceptedSerial','18446744073709551616']]){
    const dto=master();dto[key]=value;assert.throws(()=>validateMaster(dto),undefined,key);
  }
  for(const [key,value] of [['targetGain',-1],['currentGain',Infinity],['peakLeft',-1],['peakRight',NaN],['clipMask',4],['appliedSerial',1],['appliedFrame','-1'],['observationStartFrame','1.5'],['observationEndFrame','18446744073709551616']]){
    const dto=master();dto.observation[key]=value;assert.throws(()=>validateMaster(dto),undefined,key);
  }
  assert.throws(()=>validateMaster(null));
});
