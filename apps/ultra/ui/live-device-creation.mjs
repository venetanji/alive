const identity=state=>JSON.stringify([state.document,state.path,state.desiredRevision]);

export async function prepareLiveDeviceCreation(controller,acquire){
 const target=identity(controller.getState()),result=await acquire();
 if(identity(controller.getState())!==target)throw Error('Instrument creation canceled because the authoring target changed.');
 return result;
}
