import {describeContextTarget,mountContextInfo,DEFAULT_CONTEXT_INFO} from './creative-info.mjs';

// Ultra keeps Max-like tool placement and canvas hierarchy. Help is passive
// and never replaces the patch engine's #assist wiring/error/status messages.
export const ULTRA_INFO_REGIONS=[
  ['#help-reference-pane','Reference for the selected object and its supported behavior.'],
  ['#instrument-panel','Perform: controls and presets for the saved device presentation.'],
  ['#details-panel','Inspector and object library; edit parameters of the selected patch object.'],
  ['#patch-console','Console: filtered print messages from the native patch runtime.'],
  ['#workspace','Patch canvas: add, edit and connect objects; lock to perform.'],
  ['.toolbar','Patcher mode, object tools, undo/redo, zoom and optional panels.'],
  ['.document-bar','Patch windows, File commands and document identity.'],
  ['.audio-bar','Native audio engine, output settings and patch stop/panic.'],
];
export function describeUltraTarget(target){
  return describeContextTarget(target,ULTRA_INFO_REGIONS,DEFAULT_CONTEXT_INFO);
}
export function mountCanvasInfo(doc=globalThis.document){
  return mountContextInfo({doc,regions:ULTRA_INFO_REGIONS,outputId:'ultra-info-text'});
}
if(typeof document!=='undefined')mountCanvasInfo(document);
