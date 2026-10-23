// Original finite arithmetic getter observer. Full readback stays private.
autowatch=0;inlets=1;outlets=0;
var configFile=jsarguments[1],documentName=jsarguments[2],revision=Number(jsarguments[3]);
function readPrivate(path) {
    var f=new File(path,"read"),text="";
    if (!f.isopen) throw Error("private-file-unavailable");
    try {
        var length=f.eof;
        if(!(typeof length==="number"&&isFinite(length))||length<0||Math.floor(length)!==length)throw Error("private-file-read-size");
        if(f.position!==0)throw Error("private-file-read-position");
        while(f.position<length) {
            var before=f.position,count=Math.min(4096,length-before),chunk=f.readstring(count);
            if(typeof chunk!=="string"||chunk.length===0||chunk.length>count||f.position!==before+chunk.length)
                throw Error("private-file-read-progress");
            text+=chunk;
        }
        if(f.position!==length||f.eof!==length)throw Error("private-file-read-size");
        return JSON.parse(text);
    }finally{f.close();}
}
function writePrivate(path,value) {
    // ASCII chunks avoid Max's observed 32768-byte line limit and split UTF-16 pairs safely.
    var text=JSON.stringify(value).replace(/[\u007f-\uffff]/g,function(character){
        return "\\u"+("0000"+character.charCodeAt(0).toString(16)).slice(-4);
    })+"\n";
    var f=new File(path,"write","TEXT");if(!f.isopen)throw Error("private-file-unavailable");
    try {
        f.eof=0;f.position=0;
        if(f.eof!==0||f.position!==0)throw Error("private-file-truncate-refused");
        for(var offset=0;offset<text.length;offset+=4096) {
            var chunk=text.slice(offset,offset+4096),before=f.position;
            f.writestring(chunk);
            if(f.position!==before+chunk.length)throw Error("private-file-write-progress");
        }
        if(f.eof!==text.length)throw Error("private-file-write-size");
    }finally{f.close();}
}
function samePath(a,b){return typeof a==="string"&&typeof b==="string"&&a.replace(/\\/g,"/").toLowerCase()===b.replace(/\\/g,"/").toLowerCase();}
function numericValue(object,cls) {
    if(typeof object.getvalueof!=="function")throw Error("numeric-getter-unavailable");
    var raw=object.getvalueof(),representation="scalar-number",value=raw;
    if(Array.isArray(raw)) {
        if(raw.length!==1)throw Error("numeric-getter-array-shape");
        value=raw[0];representation="singleton-number-array";
    }
    if(typeof value!=="number"||!isFinite(value)||
        (cls==="number"&&Math.trunc(value)!==value))throw Error("numeric-getter-invalid");
    if(cls!=="number"&&cls!=="flonum")throw Error("numeric-getter-class");
    return {value:value,getter_representation:representation,getter_method:"getvalueof",
        semantic_tag:cls==="flonum"?"float":"int",
        semantic_tag_basis:cls==="flonum"?"flonum-class":"number-class"};
}
function rectangle(object){var rect=object.getboxattr("patching_rect");
    if(!rect||rect.length!==4)throw Error("geometry-unavailable");
    for(var v of rect)if(typeof v!=="number"||!isFinite(v))throw Error("geometry-unavailable");
    return Array.from(rect);}
function endpoint(object,port){if(!object||typeof object.varname!=="string"||!Number.isInteger(port)||port<0)throw Error("endpoint-unavailable");
    return {varname:object.varname,port:port};}
// Exact capture001 hashes; authored/live geometry remains private configuration.
var GEOMETRY_SOURCE="1eea3861a1605453fb3ed4daa4660f71e175fb2cf16ce4c4098cb53c5b94d54b";
var GEOMETRY_HELPERS={"helpstarter.js":"a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8","helpname.js":"49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa","helpdetails.js":"31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1","helpargs.js":"04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469"};
var GEOMETRY_EVIDENCE={"ack_sha256":"8a9b1405f0e5b6cc0706c57c54660777d73736eafb5281025fcd17f9f0addaeb","config_sha256":"a6512b968a0637b93752b446ebfc5c4ab86f0cb6c006b22272ec52f9091c3cff","seal_sha256":"34634c43ab942f092fe2f2ccc66e4ea987ca9c5e78d7649cc7d026e728ab9070","manifest_sha256":"65ad2d5c90b185f4c89ca512274cf61682ab2ca9e939b79f52d8234e61c6c0b3","rea_evidence_id":"ev_a9118e14891b1c344fa246dcb7663ea520d23df9c742ffc3dd450a6289a37098"};
var TIMES_GEOMETRY_PINS={"root/obj-3":{"runtime_class":"js","changed_dimension":3,"source_box_sha256":"c7355e6a1bd3aef210bfd59ead9d88a6faa6c3aaba8fb2eda9ccbaa5accf6ec9","source_text_sha256":"0ca81c69553c5299b7dc137769cb0887e0f1dc26c73bfe08c0e04891d8a99d02","saved_rect_sha256":"4814549a20cdea1cfbb09260659e96090b0f19f029fd07d1405c2a48d7288f69","live_rect_sha256":"db4ae3c63db9fecef333bf4657bce3104026f6484bd5ab0edd0bc53c328ecd7e"},"root/obj-4":{"runtime_class":"patcher","changed_dimension":3,"source_box_sha256":"339c2bd0981f0070983da5a867fef9356a4a992df87739ff60b05a946df309fc","source_text_sha256":"484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393","saved_rect_sha256":"d354caae9baa0021746491027a9c4aa1da57065450298612fc0a7b77682b0ceb","live_rect_sha256":"6dff8399adb73f3c4d2f1e05a7407d37381968cd2b51bdbb9eb2cc5ee9f849d3"},"root/obj-4/obj-5":{"runtime_class":"jsui","changed_dimension":2,"source_box_sha256":"eb55b6bacadd9290ad4ee92a7d298d2145bb0c4107afc28a60405c9d40bfa247","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"fc417b56433ec311af6d252074e5992d7ba6210f706e1ae5fd1f9982d385996c","live_rect_sha256":"9feebcd05aba863038f477eeded7fe885e0634d3e796d765969fdd55cecc478c"},"root/obj-1":{"runtime_class":"patcher","changed_dimension":3,"source_box_sha256":"ae8f1b27f351f9a4adb1997619d3b70f80666212c66402864934e5c5b753ab6e","source_text_sha256":"bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a","saved_rect_sha256":"d9aad27455a8969fb33a22e3689241f29c2d83d1eac360baf98c043f897e0e86","live_rect_sha256":"1b3974a5eef49edf4381887e103169ef36e333facb4d2ccab310ef62ea699926"}};
// Capture004 plus-only identities; measured vectors remain private.
var PLUS_SOURCE="d1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895";
var PLUS_EVIDENCE={"ack_sha256":"ed2fe5493d43ee8d00ee06cb76bd39bf5ddbbe00723e9b8ed62730ab66394cd6","config_sha256":"cc06829fbbd1e0e89888152e0f2d4407df5a4e9a3817d7aa7e3a1a40e5ac74fb","seal_sha256":"c3f37c41129eead48fc0f97597731d2c9e3ae3596746ee8d9551ee89d0426e5c","command_sha256":"7a53e382e6d67241fef6ac8e313f76986896991c789971b5f7c2d1b3cdf93261","manifest_sha256":"9b00b30ab36278e5e387bdac9deeb42364fdfa2948cf902be0a015488a04cd11","package_sha256":"22d237c6efd59c8aa87acad901da09028999e369d62c89deb1cc3fe646da177a","rea_evidence_id":"ev_ebf222bc4a6c33847e6667ce57f8dffcf8eb185e38e981a0efbfee44492f47a1","audit_sha256":"925a70d2cda0811794b03eb8f59ff76127ccfed10c0c843b36f368550ba88c53"};
var PLUS_GEOMETRY_PINS={"root/obj-1":{"source_box_sha256":"c4af8c73939eab75ed8940ff6b03159859ca0a782cd411601e0ea594db29d8e2","source_text_sha256":"e86f190fbc376badcc5d7b14a552d4e84fad436e0789bb2c7cc221fa38bf9390","saved_rect_sha256":"7c282ca427b38aa6bf81f9155d70ce5720fd0f12f6ab4ef4da21f6441c947cd6","runtime_class":"js","changed_dimension":3,"live_rect_sha256":"da868357a7d43088775aeb0784d73cae93002d63fcabbd3ceddd53521cd20e84"},"root/obj-2":{"source_box_sha256":"bbc5fe757f0ef027839d4a09709a97b50451ae9a5fec7d7f38aa810d53ce9f92","source_text_sha256":"484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393","saved_rect_sha256":"d354caae9baa0021746491027a9c4aa1da57065450298612fc0a7b77682b0ceb","runtime_class":"patcher","changed_dimension":3,"live_rect_sha256":"6dff8399adb73f3c4d2f1e05a7407d37381968cd2b51bdbb9eb2cc5ee9f849d3"},"root/obj-2/obj-4":{"source_box_sha256":"d9b8da7ef51019bd5837726c704eda09de39cffe89f08bd61e32811cde5acd0f","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"a421ba89c6cd1917427e84dbab006bf66255f8cf04f84b0b83de8c6c6b4646d2","runtime_class":"jsui","changed_dimension":2,"live_rect_sha256":"ef478f664cd641a901af80ccc3be0b0f9a1388d863a267d636bdb72fd1a5908a"},"root/obj-3":{"source_box_sha256":"310417ef44ee7139be2082fc5bbc63c5a65dfa5d10ab54894b29fe164b84c100","source_text_sha256":"bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a","saved_rect_sha256":"d9aad27455a8969fb33a22e3689241f29c2d83d1eac360baf98c043f897e0e86","runtime_class":"patcher","changed_dimension":3,"live_rect_sha256":"1b3974a5eef49edf4381887e103169ef36e333facb4d2ccab310ef62ea699926"}};
var TIMES_NUMERIC_PINS={"root/obj-4/obj-1":"3c1b5b23cac75bca82bf1aa6c7c161ca91e8e050d41c2fed4549959291d45360","root/obj-4/obj-24":"d46ddd6aff2b7184bce9a8b1218416dcb47db543026c78a533139b289cb73b42","root/obj-4/obj-23":"f122ac20a6bf9ecec78a24a73a0cbd911d938b441439337f9298ae4dfbcc853c"};
var NUMERIC_REPRESENTATION_EVIDENCE={"ack_sha256":"47764e9dac8f1ec69514509e22e93849e6d8d9a13783c60843757d8a0a3fb22a","config_sha256":"801e50b51d1055791cc07221776ebeaf1c1d755088a36c86d05722a3cfb94ec3","seal_sha256":"cdfd0f740b0705af080b6bff21d7ace7004bb94bc0713addd99e1eebf84b084d","manifest_sha256":"40bca79b06ddbbcd8644fca527e4240fab68f79b7acc8b526a6467399c562616","rea_evidence_id":"ev_51b14ef10881b6c5b881216a7fd4fa1b0f0c5c5e8bc05f75694dcbc9c4426d5d"};
var NUMERIC_REPRESENTATION_PINS={"root/obj-4/obj-1":{"source_box_sha256":"3c1b5b23cac75bca82bf1aa6c7c161ca91e8e050d41c2fed4549959291d45360","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"be69f9cbfae7d8916a7697c10b45556c60dab2bf806f472f39a1f743c6b71562","initial_numeric_sha256":"1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121"},"root/obj-4/obj-24":{"source_box_sha256":"d46ddd6aff2b7184bce9a8b1218416dcb47db543026c78a533139b289cb73b42","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"3ae5be738626430c7205dcb01a2fba671d0f93a83677c43e9ba362422cdd0754","initial_numeric_sha256":"1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121"},"root/obj-4/obj-23":{"source_box_sha256":"f122ac20a6bf9ecec78a24a73a0cbd911d938b441439337f9298ae4dfbcc853c","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"6172628b9bf9e972a77a1773539e5ffe75c0b592876ec787c48026a2e90b89f2","initial_numeric_sha256":"1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121"}};
var TIMES_ROOT_REPRESENTATION_PINS={"root/obj-3":{"source_box_sha256":"c7355e6a1bd3aef210bfd59ead9d88a6faa6c3aaba8fb2eda9ccbaa5accf6ec9","source_text_sha256":"0ca81c69553c5299b7dc137769cb0887e0f1dc26c73bfe08c0e04891d8a99d02","runtime_class":"js","runtime_classes":["js"],"saved_rect_sha256":"4814549a20cdea1cfbb09260659e96090b0f19f029fd07d1405c2a48d7288f69"},"root/obj-4":{"source_box_sha256":"339c2bd0981f0070983da5a867fef9356a4a992df87739ff60b05a946df309fc","source_text_sha256":"484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393","runtime_class":"patcher","runtime_classes":["patcher","p"],"saved_rect_sha256":"d354caae9baa0021746491027a9c4aa1da57065450298612fc0a7b77682b0ceb"},"root/obj-6":{"source_box_sha256":"5562fc5360aa673a78e47e08bba066124d3ef242ee7484a0c59c1b30bbb5e5a1","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","runtime_class":"jsui","runtime_classes":["jsui"],"saved_rect_sha256":"54f83aaab9e2c42a561a2ccf3d705fb635c1c363d5ee0f1cac7a33a87d7debb9"},"root/obj-1":{"source_box_sha256":"ae8f1b27f351f9a4adb1997619d3b70f80666212c66402864934e5c5b753ab6e","source_text_sha256":"bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a","runtime_class":"patcher","runtime_classes":["patcher","p"],"saved_rect_sha256":"d9aad27455a8969fb33a22e3689241f29c2d83d1eac360baf98c043f897e0e86"}};
var V8_REPRESENTATION_EVIDENCE={"raw_sha256":"b3c8518d4d2930f2d18c3066e9ace27038f7893d4ae3644a6d002d99b56a71d6","ack_sha256":"ae28ae272f4fe7743c121f5f8aacdc28026e29256bf9b4cdef31c0fa10ad08be","config_sha256":"a406709cab7224f3d297baa14de204565407e4572eadd6c7c0c3d6166ef46fe5","seal_sha256":"3ab64f6487e0a5f182acd9623728df66664e355472216fdad98545d9753cf5fa","manifest_sha256":"357e4296de98f953faae2a17bded5a4df66fe5438ee3b4a23ea5ada00f41260c","rea_evidence_id":"ev_de849ca377d9aa0cada5598c4443c3f57f501c23b073fa1430f610873112f8cd","audit_sha256":"0102fdaea0e0ee5bcd2e77217b25aef4c467b53124d27bca3426759f5c9fe1b1"};
var V8_ROOT_REPRESENTATION_PINS={"root/obj-4":{"source_box_sha256":"339c2bd0981f0070983da5a867fef9356a4a992df87739ff60b05a946df309fc","source_text_sha256":"484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393","saved_rect_sha256":"d354caae9baa0021746491027a9c4aa1da57065450298612fc0a7b77682b0ceb","live_rect_sha256":"6dff8399adb73f3c4d2f1e05a7407d37381968cd2b51bdbb9eb2cc5ee9f849d3"},"root/obj-1":{"source_box_sha256":"ae8f1b27f351f9a4adb1997619d3b70f80666212c66402864934e5c5b753ab6e","source_text_sha256":"bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a","saved_rect_sha256":"d9aad27455a8969fb33a22e3689241f29c2d83d1eac360baf98c043f897e0e86","live_rect_sha256":"1b3974a5eef49edf4381887e103169ef36e333facb4d2ccab310ef62ea699926"}};
var PLUS_NUMERIC_PINS={"root/obj-2/obj-1":{"source_box_sha256":"c873e45cc1ebc4c71b93a736b509fc0f622d4764df74edb3a21f5bad4d999a78","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"97bd3d008866faa2c6cdc5bf0de64333c64bd29bf79bae29b6ae070ec6823267"},"root/obj-2/obj-24":{"source_box_sha256":"d84cf4a6a5daa8db1d4b2616b5c1f94385a15d274a80be64ca07ddcb728d8cb3","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"14acfb0d484e461a00397ecfb34329cfe8167d5e47b6360edbd54f0fabbd91bc"},"root/obj-2/obj-23":{"source_box_sha256":"5b0e92ade41a0633d5d5dc178c9fd1ebc519f7014d331e4a924afff0dfe07982","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"38b2cd4242257c9f9802ef997eccb7d32e451c1b05f37868136baa42fb89636c"}};
var PLUS_CONTROLLER_COHORT_PINS={"root/obj-2/obj-1":{"source_box_sha256":"c873e45cc1ebc4c71b93a736b509fc0f622d4764df74edb3a21f5bad4d999a78","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"97bd3d008866faa2c6cdc5bf0de64333c64bd29bf79bae29b6ae070ec6823267","initial_numeric_sha256":"1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121"},"root/obj-2/obj-24":{"source_box_sha256":"d84cf4a6a5daa8db1d4b2616b5c1f94385a15d274a80be64ca07ddcb728d8cb3","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"14acfb0d484e461a00397ecfb34329cfe8167d5e47b6360edbd54f0fabbd91bc","initial_numeric_sha256":"1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121"},"root/obj-2/obj-23":{"source_box_sha256":"5b0e92ade41a0633d5d5dc178c9fd1ebc519f7014d331e4a924afff0dfe07982","source_text_sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","saved_rect_sha256":"38b2cd4242257c9f9802ef997eccb7d32e451c1b05f37868136baa42fb89636c","initial_numeric_sha256":"1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121"}};
var PLUS_CONTROLLER_COHORT_BINDING="31e249de8a69dd317ae9b50f93bca88e3da8392edda68dd7b66865e6a0c98a89";
var PLUS_CONTROLLER_FORMAT_SHA256="dcdadd560ab2234a2bf2d2b5ed44e5d7640e88eefe6bdbc98aa84aaf31649983";
var PLUS_CONTROLLER_COHORT_EVIDENCE={"trace_sha256":"2b3287e45de1123f8ac7582544aa13da5dbfba6650d2aa33e7a46b5f8be39a63","config_sha256":"4a922bf0b1e2d2c5755eb339d0fa8e73a4139f74c5acc3b92352388e85a167ad","seal_sha256":"3e5b31cdcb62618e08444d35c2ec20815cf07a21aad86de4d058ca6a94170935","manifest_sha256":"c4fc2bf8badc5cfc98b85d2b1bc8dad9cd7df42f730665521080631ecefad898","controller_sha256":"c0b0a45ef7a72a484fa976774f5a10e1ca9fcf6892603f723fb7df6c220a3d97","package_sha256":"b140eddbac9d134e162ff4cfdf2388be1285cf45b9127bd8bcc0d253ff0e99e5","historical_binding_sha256":"bce1edf4484c73bf95a5c1c1648ff7e7f8f3ce479fe96c92be6639fa6e466df6","audit_sha256":"9ded6e777503d6181120dc92c3f4745ec4eb565e5a6f29e9bd52c38755870e8d","investigation_sha256":"7b555ff81a58e426185fb9fca93b23216e18cf0205a8a923b3ca70c892e3e54b","verification_sha256":"081856c4f782f6c1603d998e6637c2355c84585635c7a3deca980e1b1cce2bfc","rea_evidence_id":"ev_a0ed6947bdad1fbe7e7ba19b62634a570fdff7803e7db65363b019dd0db409c8","trace_role":"incomplete-install-prefix","observed_revision":1};
function plusControllerNumericCohortPolicy(expected,definition,configuration) {
    var policy=expected.plus_controller_numeric_cohort_policy;
    if(typeof policy==="undefined")return null;
    var pin=PLUS_CONTROLLER_COHORT_PINS[expected.anchor],configured={};
    if(configuration&&Array.isArray(configuration.helpers)&&configuration.helpers.length===4)
        for(var i=0;i<configuration.helpers.length;i++)configured[configuration.helpers[i].name]=configuration.helpers[i].sha256;
    if(!pin||!definition||definition.document!=="plus"||definition.source_sha256!==PLUS_SOURCE||
        !sameData(definition.helper_sha256,GEOMETRY_HELPERS)||!sameData(configured,GEOMETRY_HELPERS)||
        (typeof definition.revision!=="undefined"&&definition.revision!==1&&definition.revision!==2)||
        expected.maxclass!=="flonum"||expected.runtime_class!=="flonum"||!sameData(expected.runtime_classes,["flonum"])||
        expected.source_box_sha256!==pin.source_box_sha256||expected.source_text_sha256!==pin.source_text_sha256||
        geometryVectorHash(expected.rect)!==pin.saved_rect_sha256||typeof expected.initial_numeric!=="number"||
        !isFinite(expected.initial_numeric)||geometryVectorHash([expected.initial_numeric,0,0,0])!==pin.initial_numeric_sha256)
        throw Error("plus-controller-cohort-source-binding");
    var wanted={kind:"plus-controller-numeric-cohort-v1",engine:"js-controller",document:"plus",source_sha256:PLUS_SOURCE,
        anchor:expected.anchor,source_class:"flonum",runtime_class:"number",source_box_sha256:pin.source_box_sha256,
        source_text_sha256:pin.source_text_sha256,saved_rect_sha256:pin.saved_rect_sha256,initial_numeric_sha256:pin.initial_numeric_sha256,
        cohort_anchors:Object.keys(PLUS_NUMERIC_PINS),cohort_binding_sha256:PLUS_CONTROLLER_COHORT_BINDING,
        helper_sha256:GEOMETRY_HELPERS,evidence:PLUS_CONTROLLER_COHORT_EVIDENCE,
        format_method:"getattr",format_attribute:"format",format_representation:"scalar-number",format_value_sha256:PLUS_CONTROLLER_FORMAT_SHA256,
        getter_method:"getvalueof",getter_representation:"singleton-number-array",finite_required:true,
        source_initial_equality:true,fresh_complete_cohort_required:true};
    if(!sameData(policy,wanted))throw Error("plus-controller-cohort-policy-changed");
    return policy;
}
function plusControllerCohortMetadata(definition,configuration) {
    var boxes=definition.boxes||[],inventory=definition.full_inventory||[],selected=[],saved=[],anchors=Object.keys(PLUS_NUMERIC_PINS);
    for(var i=0;i<boxes.length;i++)if(typeof boxes[i].plus_controller_numeric_cohort_policy!=="undefined")selected.push(boxes[i]);
    for(var i=0;i<inventory.length;i++)if(typeof inventory[i].plus_controller_numeric_cohort_policy!=="undefined")saved.push(inventory[i]);
    if(!selected.length&&!saved.length)return false;
    if(selected.length!==3||saved.length!==3)throw Error("incomplete-plus-controller-cohort-policy");
    var keys=["maxclass","runtime_class","runtime_classes","rect","source_box_sha256","source_text_sha256","initial_numeric","plus_controller_numeric_cohort_policy"];
    for(var i=0;i<anchors.length;i++) {
        var anchor=anchors[i],a=selected.filter(function(b){return b.anchor===anchor;}),b=saved.filter(function(b){return b.anchor===anchor;});
        if(a.length!==1||b.length!==1)throw Error("plus-controller-cohort-member-inventory");
        plusControllerNumericCohortPolicy(a[0],definition,configuration);plusControllerNumericCohortPolicy(b[0],definition,configuration);
        for(var j=0;j<keys.length;j++)if(!sameData(a[0][keys[j]],b[0][keys[j]]))throw Error("plus-controller-cohort-descriptor-copy");
    }
    return true;
}
function sameData(a,b) {
    if(a===b)return true;
    if(!a||!b||typeof a!=="object"||typeof b!=="object"||Array.isArray(a)!==Array.isArray(b))return false;
    var left=Object.keys(a).sort(),right=Object.keys(b).sort();
    if(left.length!==right.length)return false;
    for(var i=0;i<left.length;i++)if(left[i]!==right[i]||!sameData(a[left[i]],b[right[i]]))return false;
    return true;
}
// SHA-256 of an ASCII JSON rectangle; this independently pins private vectors.
function geometryVectorHash(rect) {
    if(!Array.isArray(rect)||rect.length!==4)throw Error("geometry-hash-shape");
    for(var check=0;check<4;check++)if(typeof rect[check]!=="number"||!isFinite(rect[check]))throw Error("geometry-hash-value");
    return byteStringHash(JSON.stringify(rect));
}
function sourceTextHash(text) {
    if(typeof text!=="string")throw Error("source-text-unavailable");
    return byteStringHash(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g,
        function(_,hex){return String.fromCharCode(parseInt(hex,16));}));
}
function byteStringHash(input) {
    var words=[],length=input.length*8;
    for(var i=0;i<input.length;i++)words[i>>2]=(words[i>>2]||0)|(input.charCodeAt(i)<<(24-(i%4)*8));
    words[length>>5]=(words[length>>5]||0)|(0x80<<(24-length%32));
    words[(((length+64)>>9)<<4)+15]=length;
    var h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
        0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
        0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
        0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
        0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
        0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
        0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
        0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    function rotate(value,count){return (value>>>count)|(value<<(32-count));}
    for(var offset=0;offset<words.length;offset+=16){
        var w=[],state=h.slice(0);
        for(var round=0;round<64;round++){
            if(round<16)w[round]=words[offset+round]|0;
            else{var a=w[round-15],b=w[round-2];
                w[round]=((rotate(a,7)^rotate(a,18)^(a>>>3))+w[round-16]+
                    (rotate(b,17)^rotate(b,19)^(b>>>10))+w[round-7])|0;}
            var first=(state[7]+(rotate(state[4],6)^rotate(state[4],11)^rotate(state[4],25))+
                ((state[4]&state[5])^(~state[4]&state[6]))+k[round]+w[round])|0;
            var second=((rotate(state[0],2)^rotate(state[0],13)^rotate(state[0],22))+
                ((state[0]&state[1])^(state[0]&state[2])^(state[1]&state[2])))|0;
            state=[(first+second)|0,state[0],state[1],state[2],(state[3]+first)|0,state[4],state[5],state[6]];
        }
        for(var index=0;index<8;index++)h[index]=(h[index]+state[index])|0;
    }
    var output="";for(var index=0;index<8;index++)output+=("00000000"+(h[index]>>>0).toString(16)).slice(-8);
    return output;
}
function observedGeometryPolicy(expected,definition,configuration) {
    var policy=expected.observed_geometry_policy;if(typeof policy==="undefined")return null;
    var plus=definition&&definition.document==="plus",name=plus?"plus":"times",source=plus?PLUS_SOURCE:GEOMETRY_SOURCE;
    var pin=(plus?PLUS_GEOMETRY_PINS:TIMES_GEOMETRY_PINS)[expected.anchor],evidence=plus?PLUS_EVIDENCE:GEOMETRY_EVIDENCE,configured={};
    if(!pin||!definition||definition.document!==name||definition.source_sha256!==source||
        !sameData(definition.helper_sha256,GEOMETRY_HELPERS)||!configuration||!configuration.helpers||configuration.helpers.length!==4)
        throw Error("unobserved-arithmetic-geometry-binding");
    for(var index=0;index<configuration.helpers.length;index++){var helper=configuration.helpers[index];configured[helper.name]=helper.sha256;}
    var wanted={kind:name+"-observed-geometry-v1",document:name,source_sha256:source,
        anchor:expected.anchor,runtime_class:pin.runtime_class,changed_dimension:pin.changed_dimension,
        source_box_sha256:pin.source_box_sha256,source_text_sha256:pin.source_text_sha256,
        saved_rect:expected.rect,live_rect:policy.live_rect,saved_rect_sha256:pin.saved_rect_sha256,
        live_rect_sha256:pin.live_rect_sha256,helper_sha256:GEOMETRY_HELPERS,evidence:evidence,
        saved_incoming_routes:0,saved_outgoing_routes:0};
    if(!sameData(policy,wanted)||!sameData(configured,GEOMETRY_HELPERS)||expected.runtime_class!==pin.runtime_class||
        (plus&&expected.maxclass!==(pin.runtime_class==="jsui"?"jsui":"newobj"))||
        expected.source_box_sha256!==pin.source_box_sha256||expected.source_text_sha256!==pin.source_text_sha256||
        expected.saved_incoming_routes!==0||expected.saved_outgoing_routes!==0||
        !Array.isArray(policy.live_rect)||policy.live_rect.length!==4||!Array.isArray(expected.rect)||expected.rect.length!==4)
        throw Error("measured-arithmetic-geometry-binding-changed");
    for(var i=0;i<4;i++)if(typeof policy.live_rect[i]!=="number"||!isFinite(policy.live_rect[i])||
        typeof expected.rect[i]!=="number"||!isFinite(expected.rect[i])||
        (i===pin.changed_dimension?policy.live_rect[i]===expected.rect[i]:policy.live_rect[i]!==expected.rect[i]))
        throw Error("measured-arithmetic-geometry-vector-changed");
    if(geometryVectorHash(policy.saved_rect)!==pin.saved_rect_sha256||geometryVectorHash(policy.live_rect)!==pin.live_rect_sha256)
        throw Error("measured-arithmetic-geometry-vector-hash-changed");
    return policy;
}
function capabilityObservation(object,method,attribute) {
    var result={method:method,status:"unavailable",representation:"unavailable",value:null};
    if(attribute)result.attribute=attribute;
    var raw;try{if(typeof object[method]!=="function")return result;
        raw=attribute?object[method](attribute):object[method]();}catch(error){
        result.status="threw";result.representation="threw";return result;}
    result.status="returned";
    if(raw===null){result.representation="null";return result;}
    if(typeof raw==="undefined"){result.representation="undefined";return result;}
    var value=raw;
    if(Array.isArray(raw)) {
        if(raw.length!==1){result.representation="ambiguous-array";return result;}
        value=raw[0];result.representation="singleton-number-array";
    }else result.representation="scalar-number";
    if(typeof value!=="number"){result.representation="other";return result;}
    if(!isFinite(value)){result.representation="nonfinite";return result;}
    result.value=value;return result;
}
function controllerNumericRepresentationPolicy(expected,definition,configuration) {
    var policy=expected.controller_numeric_representation_policy;if(typeof policy==="undefined")return null;
    var pin=NUMERIC_REPRESENTATION_PINS[expected.anchor],configured={};
    if(!pin||!definition||definition.document!=="times"||definition.source_sha256!==GEOMETRY_SOURCE||
        !sameData(definition.helper_sha256,GEOMETRY_HELPERS)||!configuration||!configuration.helpers||configuration.helpers.length!==4)
        throw Error("unobserved-controller-numeric-binding");
    for(var i=0;i<configuration.helpers.length;i++)configured[configuration.helpers[i].name]=configuration.helpers[i].sha256;
    var wanted={kind:"times-controller-numeric-representation-v1",engine:"js-controller",document:"times",
        source_sha256:GEOMETRY_SOURCE,anchor:expected.anchor,source_class:"flonum",runtime_class:"number",
        source_box_sha256:pin.source_box_sha256,source_text_sha256:pin.source_text_sha256,
        saved_rect_sha256:pin.saved_rect_sha256,initial_numeric_sha256:pin.initial_numeric_sha256,
        helper_sha256:GEOMETRY_HELPERS,evidence:NUMERIC_REPRESENTATION_EVIDENCE,
        format_method:"getattr",format_attribute:"format",format_representation:"scalar-number",format_value:6,
        getter_method:"getvalueof",getter_representation:"singleton-number-array",finite_required:true,source_initial_equality:true};
    if(!sameData(policy,wanted)||!sameData(configured,GEOMETRY_HELPERS)||expected.maxclass!=="flonum"||
        expected.runtime_class!=="flonum"||!sameData(expected.runtime_classes,["flonum"])||
        expected.source_box_sha256!==pin.source_box_sha256||expected.source_text_sha256!==pin.source_text_sha256||
        typeof expected.initial_numeric!=="number"||!isFinite(expected.initial_numeric)||
        geometryVectorHash(expected.rect)!==pin.saved_rect_sha256||
        geometryVectorHash([expected.initial_numeric,0,0,0])!==pin.initial_numeric_sha256||
        (typeof definition.revision!=="undefined"&&
            (typeof definition.revision!=="number"||Math.floor(definition.revision)!==definition.revision||
                (definition.revision!==1&&definition.revision!==2))))throw Error("controller-numeric-policy-changed");
    return policy;
}
function v8RepresentationPolicy(expected,definition,configuration,numeric) {
    if(definition.document==="plus")return plusV8Policy(expected,definition,configuration,numeric);
    var policy=expected[numeric?"v8_numeric_representation_policy":"v8_root_representation_policy"];
    if(typeof policy==="undefined")return null;
    var pin=(numeric?NUMERIC_REPRESENTATION_PINS:V8_ROOT_REPRESENTATION_PINS)[expected.anchor],configured={};
    if(!pin||!definition||definition.document!=="times"||definition.source_sha256!==GEOMETRY_SOURCE||
        !sameData(definition.helper_sha256,GEOMETRY_HELPERS)||!configuration||!Array.isArray(configuration.helpers)||
        configuration.helpers.length!==4)throw Error("unobserved-v8-representation-binding");
    for(var helper of configuration.helpers)configured[helper.name]=helper.sha256;
    var wanted=Object.assign({kind:"times-v8-"+(numeric?"numeric":"root")+"-representation-v1",engine:"v8",document:"times",
        source_sha256:GEOMETRY_SOURCE,anchor:expected.anchor,source_class:numeric?"flonum":"newobj",
        runtime_class:numeric?"number":"jpatcher"},pin,{helper_sha256:GEOMETRY_HELPERS,evidence:V8_REPRESENTATION_EVIDENCE});
    if(numeric)Object.assign(wanted,{format_method:"getattr",format_attribute:"format",format_representation:"scalar-number",
        format_value:6,getter_method:"getvalueof",getter_representation:"scalar-number",finite_required:true,initial_equality_action:"install"});
    else Object.assign(wanted,{source_runtime_class:"patcher",saved_rect:expected.rect,live_rect:policy.live_rect,
        source_varname:expected.source_varname,saved_incoming_routes:0,saved_outgoing_routes:0});
    if(!sameData(policy,wanted)||!sameData(configured,GEOMETRY_HELPERS)||expected.maxclass!==(numeric?"flonum":"newobj")||
        expected.runtime_class!==(numeric?"flonum":"patcher")||
        !sameData(expected.runtime_classes,numeric?["flonum"]:["patcher","p"])||
        expected.source_box_sha256!==pin.source_box_sha256||expected.source_text_sha256!==pin.source_text_sha256||
        geometryVectorHash(expected.rect)!==pin.saved_rect_sha256||
        (typeof definition.revision!=="undefined"&&(definition.revision!==1&&definition.revision!==2)))
        throw Error("v8-representation-policy-changed");
    if(numeric) {
        if(typeof expected.initial_numeric!=="number"||!isFinite(expected.initial_numeric)||
            geometryVectorHash([expected.initial_numeric,0,0,0])!==pin.initial_numeric_sha256)
            throw Error("v8-source-derived-default-changed");
    }else if(expected.source_varname!==(expected.anchor==="root/obj-4"?"basic_tab":"q_tab")||
        expected.saved_incoming_routes!==0||expected.saved_outgoing_routes!==0||
        geometryVectorHash(policy.live_rect)!==pin.live_rect_sha256)throw Error("v8-measured-root-policy-changed");
    return policy;
}
function representationObjects(patcher,limit) {
    var objects=[],object,status="complete";
    if(!patcher)return {objects:objects,complete:false,status:"unavailable",limit:limit};
    try {
        object=patcher.firstobject;
        while(object&&objects.length<=limit){objects.push(object);object=object.nextobject;}
        if(typeof object==="undefined")status="unavailable";
        else if(object||objects.length>limit)status="overflow";
    }catch(error){status="threw";}
    return {objects:objects,complete:status==="complete",status:status,limit:limit};
}
function representationRectangle(object) {
    try{return rectangle(object);}catch(error){return null;}
}
var PLUS_ROOT_DIAGNOSTIC_PINS={};
for(var plusRootAnchor of ["root/obj-1","root/obj-2","root/obj-3"]) {
    var plusRootPin=PLUS_GEOMETRY_PINS[plusRootAnchor];
    PLUS_ROOT_DIAGNOSTIC_PINS[plusRootAnchor]={source_class:"newobj",source_box_sha256:plusRootPin.source_box_sha256,
        source_text_sha256:plusRootPin.source_text_sha256,saved_rect_sha256:plusRootPin.saved_rect_sha256,
        runtime_class:plusRootPin.runtime_class,runtime_classes:plusRootPin.runtime_class==="patcher"?["patcher","p"]:[plusRootPin.runtime_class]};
}
PLUS_ROOT_DIAGNOSTIC_PINS["root/obj-4"]={source_class:"jsui",source_box_sha256:"bff84f2c0e682d712f384b4d5f73017bcc936392a7d0b981ec4ef8ef7a3deb29",
    source_text_sha256:"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    saved_rect_sha256:"54f83aaab9e2c42a561a2ccf3d705fb635c1c363d5ee0f1cac7a33a87d7debb9",runtime_class:"jsui",runtime_classes:["jsui"]};
var PLUS_V8_PROJECTION_SHA256="ba8d3d1ec23265bd75f16641fa95668466888d4033811fda95bcdef757da600f";
var PLUS_V8_FORMAT_SHA256="dcdadd560ab2234a2bf2d2b5ed44e5d7640e88eefe6bdbc98aa84aaf31649983";
var PLUS_V8_EVIDENCE={raw_sha256:"87459a07efa7a7f8d0bdcaba10148f138369d080104324e520cc7fb1aaf1fd71",
    install_ack_sha256:"ba39c2e9b59c9983d938cb8e500f05aef3b82af830558548e50ef97d31df1a82",
    readback_ack_sha256:"1c4dcdb18ed66194264e9fbfe914664c636ab066375636647cb4d3038fb62f01",
    command_sha256:"be98938644e0ee42eabb329709effcc5ce40d32c6007ee4e139f6856ce7eab28",
    config_sha256:"eb44b4930d0bb2504f9739367dad7b144c12b1baada9ac8d37f8bde127ae550b",
    seal_sha256:"cedafaa9aa57b066b7fa19b95580c08b884ef2267bec42c6143429bbd41a9641",
    manifest_sha256:"73b623f8893e5758f8f74cbc4c41f599e291c12cb9d3a662c572d55fcc40bc7f",
    historical_binding_sha256:"97a59c54d9185b47c417c876b12ac8b8ebc4734bb80ad7b439e6e5790aaf991b",
    historical_files_sha256:"f01f727c2f17b10175de23da47a536e6a10f19d609bb7d0e92add241811fedac",
    package_sha256:"121d5aa5e3056337306bbe2d7a2771221f53e7adb9750572d934d20ac8a8c978",
    controller_sha256:"da4473ac8014f39fd255b830121508738c16980b6e303fb0a9b8c963ce0f13a8",
    reader_sha256:"7d857163d254c82ecbc02b6cd3ff43be1fdf9f67ed09ddf6eb554a7d87c175fa",
    trace_sha256:"bc0e23dc19b130b4bcfe09777a74e56a48f62a9d39860cae7fdc8d3e1a837185",
    audit_sha256:"2e96fed0d6acd58fff7b033a17294c1ccc54e15a56590862a142fe723eac704e",
    investigation_sha256:"dacc776b2429cab7f76f44a589a131cc3b89dd624afbc25c2c85b98116a62d12",
    rea_evidence_id:"ev_c19e98841d00f4654a6c405a8d80067f1d966cf11a11106234b93a05a70c13a5",
    observation_role:"failed-install-readback-diagnostics",observed_revision:1,observed_request_id:52,
    observed_operation_request_id:51,raw_success:false,raw_error_code:"numeric-readback-refused",observed_strict_mismatch:true};
var PLUS_BOX_KEYS=["id","anchor","maxclass","runtime_class","runtime_classes","rect","inlets","outlets","authored_text",
    "authored_empty","initial_numeric","role","source_box_sha256","source_text_sha256"];
var PLUS_FULL_KEYS=["anchor","maxclass","runtime_class","runtime_classes","rect","child","source_varname","inlets","outlets",
    "authored_text","authored_empty","source_text_sha256","source_box_sha256","saved_incoming_routes","saved_outgoing_routes"];
function sortedSourceJSON(value) {
    if(typeof value==="number"&&!isFinite(value))throw Error("plus-source-nonfinite");
    if(Array.isArray(value))return value.map(sortedSourceJSON);
    if(value&&typeof value==="object") {
        var result={};for(var key of Object.keys(value).sort())result[key]=sortedSourceJSON(value[key]);return result;
    }
    return value;
}
function plusV8Policy(expected,definition,configuration,numeric) {
    var field=numeric?"v8_numeric_representation_policy":"v8_root_representation_policy",policy=expected[field];
    if(typeof policy==="undefined")return null;
    var pin=numeric?PLUS_NUMERIC_PINS[expected.anchor]:
        ["root/obj-2","root/obj-3"].includes(expected.anchor)&&PLUS_GEOMETRY_PINS[expected.anchor],configured={};
    if(!pin||definition.source_sha256!==PLUS_SOURCE||!sameData(definition.helper_sha256,GEOMETRY_HELPERS)||
        !configuration||!Array.isArray(configuration.helpers)||configuration.helpers.length!==4)
        throw Error("plus-v8-source-policy-binding");
    for(var helper of configuration.helpers)configured[helper.name]=helper.sha256;
    var wanted={kind:"plus-v8-"+(numeric?"numeric":"root")+"-representation-v1",engine:"v8",document:"plus",
        source_sha256:PLUS_SOURCE,anchor:expected.anchor,source_class:numeric?"flonum":"newobj",runtime_class:numeric?"number":"jpatcher",
        source_box_sha256:pin.source_box_sha256,source_text_sha256:pin.source_text_sha256,saved_rect_sha256:pin.saved_rect_sha256,
        helper_sha256:GEOMETRY_HELPERS,evidence:PLUS_V8_EVIDENCE};
    if(numeric)Object.assign(wanted,{initial_numeric_sha256:"1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121",
        format_method:"getattr",format_attribute:"format",format_representation:"scalar-number",format_value_sha256:PLUS_V8_FORMAT_SHA256,
        getter_method:"getvalueof",getter_representation:"scalar-number",finite_required:true,initial_equality_action:"install"});
    else Object.assign(wanted,{live_rect_sha256:pin.live_rect_sha256,source_runtime_class:"patcher",saved_rect:expected.rect,
        live_rect:policy.live_rect,source_varname:expected.source_varname,saved_incoming_routes:0,saved_outgoing_routes:0});
    if(!sameData(policy,wanted)||!sameData(configured,GEOMETRY_HELPERS)||expected.maxclass!==(numeric?"flonum":"newobj")||
        expected.runtime_class!==(numeric?"flonum":"patcher")||!sameData(expected.runtime_classes,numeric?["flonum"]:["patcher","p"])||
        expected.source_box_sha256!==pin.source_box_sha256||expected.source_text_sha256!==pin.source_text_sha256||
        geometryVectorHash(expected.rect)!==pin.saved_rect_sha256)throw Error("plus-v8-policy-changed");
    if(numeric) {
        if(typeof expected.initial_numeric!=="number"||!isFinite(expected.initial_numeric)||
            geometryVectorHash([expected.initial_numeric,0,0,0])!==wanted.initial_numeric_sha256)throw Error("plus-v8-default-changed");
    }else if(expected.source_varname!==(expected.anchor==="root/obj-2"?"basic_tab":"q_tab")||
        expected.saved_incoming_routes!==0||expected.saved_outgoing_routes!==0||geometryVectorHash(policy.live_rect)!==pin.live_rect_sha256)
        throw Error("plus-v8-root-policy-changed");
    return policy;
}
function plusV8Metadata(definition,configuration) {
    var fields=["v8_numeric_representation_policy","v8_root_representation_policy"],present=[];
    for(var view of ["boxes","full_inventory","observer_leaves"])for(var b of definition[view]||[])
        for(var field of fields)if(typeof b[field]!=="undefined")present.push(b[field]);
    if(!present.length)return false;
    if(definition.document!=="plus") {
        if(present.some(p=>p&&typeof p.kind==="string"&&p.kind.indexOf("plus-")===0))throw Error("transferred-plus-v8-policy");
        return false;
    }
    if(definition.source_sha256!==PLUS_SOURCE||!sameData(definition.helper_sha256,GEOMETRY_HELPERS)||
        ![1,2].includes(definition.revision)||!plusControllerCohortMetadata(definition,configuration))throw Error("plus-v8-source-set-binding");
    var projection={document:"plus",source_sha256:PLUS_SOURCE,helper_sha256:GEOMETRY_HELPERS,basic_anchor:definition.basic_anchor,
        basic_varname:definition.basic_varname,saved_edges:definition.saved_edges,observer_leaves:definition.observer_leaves};
    for(var pair of [["boxes",PLUS_BOX_KEYS],["full_inventory",PLUS_FULL_KEYS]]) {
        var view=pair[0],keys=pair[1],entries=definition[view];
        if(!Array.isArray(entries))throw Error("plus-v8-source-view-unavailable");
        projection[view]=[];
        for(var b of entries) {
            var allowed=keys.slice(),anchor=b.anchor;
            if(PLUS_GEOMETRY_PINS[anchor]) {
                allowed.push("observed_geometry_policy");
                if(view==="boxes")allowed.push("saved_incoming_routes","saved_outgoing_routes");
                if(!b.observed_geometry_policy)throw Error("plus-v8-geometry-set-incomplete");
                observedGeometryPolicy(b,definition,configuration);
            }
            if(PLUS_NUMERIC_PINS[anchor]) {
                allowed.push("plus_controller_numeric_cohort_policy",fields[0]);
                if(view==="full_inventory")allowed.push("initial_numeric");
            }
            if(view==="full_inventory"&&["root/obj-2","root/obj-3"].includes(anchor))allowed.push(fields[1]);
            if(keys.some(k=>!Object.prototype.hasOwnProperty.call(b,k))||Object.keys(b).some(k=>!allowed.includes(k))||
                !Number.isInteger(b.inlets)||b.inlets<0||!Number.isInteger(b.outlets)||b.outlets<0||typeof b.authored_empty!=="boolean"||
                (view==="boxes"&&(typeof b.id!=="string"||anchor!=="root/obj-2/"+b.id))||
                (view==="full_inventory"&&(typeof b.child!=="boolean"||![b.saved_incoming_routes,b.saved_outgoing_routes].every(n=>Number.isInteger(n)&&n>=0))))
                throw Error("plus-v8-source-descriptor-fields");
            var projected={};for(var key of keys)projected[key]=b[key];projection[view].push(projected);
        }
        for(var field of fields) {
            var wanted=field===fields[0]?Object.keys(PLUS_NUMERIC_PINS):view==="full_inventory"?["root/obj-2","root/obj-3"]:[],
                selected=entries.filter(b=>typeof b[field]!=="undefined");
            if(!sameData(selected.map(b=>b.anchor).sort(),wanted.slice().sort()))throw Error("plus-v8-exact-policy-set");
            for(var b of selected)plusV8Policy(b,definition,configuration,field===fields[0]);
        }
    }
    if(!Array.isArray(definition.saved_edges)||!Array.isArray(definition.observer_leaves))throw Error("plus-v8-source-routes-unavailable");
    for(var leaf of definition.observer_leaves) {
        var b=definition.boxes.find(b=>b.anchor===leaf.anchor);
        if(!b||!Number.isInteger(leaf.port)||leaf.port<0||leaf.port>=b.outlets)throw Error("plus-v8-source-leaf-port");
    }
    for(var edge of definition.saved_edges) {
        for(var side of ["source","destination"]) {
            var ep=edge[side],b=Array.isArray(ep)&&definition.boxes.find(b=>b.id===ep[0]);
            if(!b||ep.length!==2||!Number.isInteger(ep[1])||ep[1]<0||ep[1]>=(side==="source"?b.outlets:b.inlets))
                throw Error("plus-v8-source-edge-port");
        }
        if(typeof edge.order!=="undefined"&&edge.order!==null&&(!Number.isInteger(edge.order)||edge.order<0))throw Error("plus-v8-source-edge-order");
    }
    if(sourceTextHash(JSON.stringify(sortedSourceJSON(projection)))!==PLUS_V8_PROJECTION_SHA256)throw Error("plus-v8-pristine-projection-changed");
    for(var b of definition.boxes) {
        var copies=definition.full_inventory.filter(e=>e.anchor===b.anchor),common=PLUS_BOX_KEYS.filter(k=>PLUS_FULL_KEYS.includes(k));
        if(copies.length!==1||common.some(k=>!sameData(b[k],copies[0][k])))throw Error("plus-v8-source-view-correspondence");
        if(PLUS_NUMERIC_PINS[b.anchor]&&(!sameData(b.initial_numeric,copies[0].initial_numeric)||
            !sameData(b[fields[0]],copies[0][fields[0]])))throw Error("plus-v8-numeric-copy-changed");
    }
    return true;
}
function plusV8RequestBinding(root,definition,request,configuration) {
    var rev=definition.revision,owner=configuration.lifecycle&&configuration.lifecycle.owners&&
        configuration.lifecycle.owners[definition.lifecycle_owner_inlet],event=/^plus-A([0-9]{2})$/.exec(request.step_id),n=event?Number(event[1]):0;
    var step=request.action==="install"?request.step_id==="install-plus-r"+rev:request.action==="close"?
        request.step_id==="close-plus-r"+rev:request.action==="event"&&event&&(rev===1?n>=1&&n<=20:n>=21&&n<=22);
    var documents=(configuration.documents||[]).filter(d=>d.document==="plus"&&d.revision===rev);
    if(![1,2].includes(rev)||request.op!==(request.action==="close"?"operation":"readback")||request.document!=="plus"||
        request.revision!==rev||request.action_document!=="plus"||request.action_revision!==rev||request.source_sha256!==PLUS_SOURCE||!step||
        !Number.isInteger(request.command_id)||request.command_id<1||!Number.isInteger(request.operation_request_id)||request.operation_request_id<1||
        (request.action==="close"&&request.command_id!==request.operation_request_id)||definition.lifecycle_owner_inlet!==rev+1||
        !owner||owner.inlet!==rev+1||owner.document!=="plus"||owner.revision!==rev||owner.source_sha256!==PLUS_SOURCE||
        owner.working_path!==definition.working_windows_path||documents.length!==1||documents[0]!==definition||
        !root||root.parentpatcher!==null||!samePath(root.filepath,definition.working_windows_path))throw Error("plus-v8-request-current-owner-binding");
}
function createPlusReadbackPass(root,definition,request,configuration,originalRequest) {
    // Only this invocation owns the observations and their single consumption.
    if(!plusV8Metadata(definition,configuration))return null;
    var captures=[],seen=[],consumed=false,issued=false,live=null,diagnostic=null,witness=null;
    function capture(value) {
        if(!value||typeof value!=="object"||seen.includes(value))return;
        seen.push(value);var keys=Object.keys(value),refs=keys.map(k=>value[k]);
        captures.push({object:value,keys:keys,refs:refs,length:Array.isArray(value)?value.length:null});
        for(var ref of refs)capture(ref);
    }
    capture(configuration);capture(definition);capture(request);capture(originalRequest);
    function dataCurrent() {
        for(var row of captures) {
            var keys=Object.keys(row.object);
            if(keys.length!==row.keys.length||(row.length!==null&&row.object.length!==row.length))throw Error("plus-v8-pass-input-changed");
            for(var i=0;i<keys.length;i++)if(keys[i]!==row.keys[i]||row.object[keys[i]]!==row.refs[i])throw Error("plus-v8-pass-input-changed");
        }
        plusV8RequestBinding(root,definition,request,configuration);
    }
    function bindings() {
        dataCurrent();var rootInventory=representationObjects(root,8);dataCurrent();
        if(!rootInventory.complete||rootInventory.objects.length!==8)throw Error("plus-v8-root-inventory-incomplete");
        var roots=definition.full_inventory.filter(b=>b.anchor.split("/").length===2),rows=[],used=[],basic=null;
        for(var b of roots) {
            var policy=observedGeometryPolicy(b,definition,configuration),v8=plusV8Policy(b,definition,configuration,false),matches=[];
            for(var object of rootInventory.objects) {
                var rect=rectangle(object);dataCurrent();
                if((object.varname||"")===(b.source_varname||"")&&(v8?sameData(rect,v8.live_rect):
                    sameData(rect,b.rect)||policy&&sameData(rect,policy.live_rect)))matches.push(object);
            }
            if(matches.length!==1||used.includes(matches[0]))throw Error("plus-v8-root-candidate-binding");
            var object=matches[0];used.push(object);
            if(v8?object.maxclass!=="jpatcher":!b.runtime_classes.includes(object.maxclass))throw Error("plus-v8-root-class-binding");
            if(b.anchor===definition.basic_anchor){basic=object.subpatcher();dataCurrent();}
        }
        var owner=configuration.lifecycle.owners[definition.lifecycle_owner_inlet],harness=[
            ["__alive_arithmetic_reader","v8",[-3000,-3000,160,133]],
            ["__alive_arithmetic_disposer","thispatcher",[-3100,-3000,100,22]],
            ["__alive_arithmetic_freebang","freebang",[-3200,-3000,100,22],"freebang"],
            ["__alive_arithmetic_lifecycle_send","send",[-3400,-3000,200,64],"send "+owner.channel]];
        for(var h of harness) {
            var matches=rootInventory.objects.filter(o=>o.varname===h[0]);
            if(matches.length!==1||used.includes(matches[0]))throw Error("plus-v8-root-harness-identity");
            var object=matches[0];used.push(object);
            if(object.maxclass!==h[1]||!sameData(rectangle(object),h[2])||(object.valid!==true&&object.valid!==1)||
                typeof object.boxtext!=="string"||(h.length===4&&object.boxtext!==h[3]))throw Error("plus-v8-root-harness-binding");
            dataCurrent();
        }
        var inventory=representationObjects(basic,35);dataCurrent();
        if(!inventory.complete||inventory.objects.length!==35)throw Error("plus-v8-basic-inventory-incomplete");
        for(var object of rootInventory.objects.concat(inventory.objects)) {
            var rect=rectangle(object);dataCurrent();
            rows.push({object:object,maxclass:object.maxclass,varname:object.varname,rect:rect,valid:object.valid,
                boxtext:object.boxtext});dataCurrent();
        }
        return {root:rootInventory.objects,basic:basic,objects:inventory.objects,rows:rows,path:root.filepath,parent:root.parentpatcher};
    }
    function check() {
        dataCurrent();var now=bindings();
        if(live&&(now.basic!==live.basic||!sameData(now.path,live.path)||now.parent!==live.parent||
            now.root.some((o,i)=>o!==live.root[i])||now.objects.some((o,i)=>o!==live.objects[i])||
            now.rows.some((row,i)=>row.object!==live.rows[i].object||row.maxclass!==live.rows[i].maxclass||
                row.varname!==live.rows[i].varname||row.valid!==live.rows[i].valid||row.boxtext!==live.rows[i].boxtext||
                !sameData(row.rect,live.rows[i].rect))))throw Error("plus-v8-live-binding-changed");
        dataCurrent();
    }
    live=bindings();
    var placeholder={numeric:definition.boxes.filter(b=>b.v8_numeric_representation_policy).map(b=>({anchor:b.anchor,
        actual_runtime_class:"number",live_rect:b.rect}))};
    collectBasicRetention(root,definition,request,configuration,placeholder);check();
    diagnostic=collectPlusRepresentationDiagnostics(root,definition,request,configuration,check);
    try {
        check();
        if(!diagnostic.inventory_complete||diagnostic.numeric_rows.length!==3||diagnostic.root_rows.length!==4)
            throw Error("plus-v8-five-policy-witness-unavailable");
        var numeric=[];
        for(var row of diagnostic.numeric_rows) {
            var b=definition.boxes.find(b=>b.anchor===row.anchor),format=row.format_observation,value=row.value_observation;
            if(!b||row.actual_runtime_class!=="number"||row.candidate_count!==1||!row.candidate_count_complete||!row.geometry_matches||
                !sameData(row.live_rect,b.rect)||format.status!=="returned"||format.representation!=="scalar-number"||
                value.status!=="returned"||value.representation!=="scalar-number"||typeof format.value!=="number"||!isFinite(format.value)||
                typeof value.value!=="number"||!isFinite(value.value)||geometryVectorHash([format.value,0,0,0])!==PLUS_V8_FORMAT_SHA256||
                (request.action==="install"&&value.value!==b.initial_numeric))throw Error("plus-v8-numeric-capability-refused");
            var copy=Object.assign({},row);delete copy.expected_runtime_classes;delete copy.observed_candidate_count;delete copy.probe_disposition;
            numeric.push(copy);
        }
        var roots=[];
        for(var anchor of ["root/obj-2","root/obj-3"]) {
            var row=diagnostic.root_rows.find(r=>r.anchor===anchor),b=definition.full_inventory.find(b=>b.anchor===anchor);
            if(!row||row.actual_runtime_class!=="jpatcher"||row.candidate_count!==1||!row.candidate_count_complete||
                !sameData(row.live_rect,b.v8_root_representation_policy.live_rect))throw Error("plus-v8-root-witness-refused");
            roots.push({anchor:anchor,source_box_sha256:b.source_box_sha256,source_text_sha256:b.source_text_sha256,source_class:"newobj",
                actual_runtime_class:"jpatcher",varname:b.source_varname,live_rect:row.live_rect,candidate_count:1,candidate_count_complete:true});
        }
        check();witness=JSON.parse(JSON.stringify({version:"plus-v8-representation-witnesses-v1",engine:"v8",request_id:request.command_id,
            operation_request_id:request.operation_request_id,step_id:request.step_id,action:request.action,action_document:request.action_document,
            action_revision:request.action_revision,document:"plus",revision:definition.revision,source_sha256:PLUS_SOURCE,
            helper_sha256:GEOMETRY_HELPERS,working_path:definition.working_windows_path,root_is_top_level:true,receipt_tag_observed:false,
            evidence:PLUS_V8_EVIDENCE,inventory_coverage:diagnostic.inventory_coverage,numeric:numeric,roots:roots}));issued=true;
        return {diagnostic:diagnostic,basic:live.basic,check:check,consume:function(){
            if(!issued||consumed)throw Error("plus-v8-witness-not-owned");check();consumed=true;return witness;}};
    }catch(error){error.v8_representation_diagnostics=diagnostic;throw error;}
}
function collectPlusRepresentationDiagnostics(root,definition,request,configuration,current) {
    var diagnostic={engine:"v8",request_id:request.command_id,operation_request_id:request.operation_request_id,
        step_id:request.step_id,action:request.action,action_document:request.action_document,action_revision:request.action_revision,
        document:"plus",revision:definition.revision,source_sha256:PLUS_SOURCE,helper_sha256:GEOMETRY_HELPERS,
        receipt_tag_observed:false,root_rows:[],numeric_rows:[],strict_mismatch:false};
    try {
    plusV8Metadata(definition,configuration);
    if(!plusControllerCohortMetadata(definition,configuration))return null;
    var revision=definition.revision,owner=configuration.lifecycle&&configuration.lifecycle.owners&&
        configuration.lifecycle.owners[definition.lifecycle_owner_inlet],event=/^plus-A([0-9]{2})$/.exec(request.step_id),n=event?Number(event[1]):0;
    var step=request.action==="install"?request.step_id==="install-plus-r"+revision:
        request.action==="close"?request.step_id==="close-plus-r"+revision:
        request.action==="event"&&event&&(revision===1?n>=1&&n<=20:n>=21&&n<=22);
    if((revision!==1&&revision!==2)||request.op!==(request.action==="close"?"operation":"readback")||
        request.document!=="plus"||request.source_sha256!==PLUS_SOURCE||request.revision!==revision||
        request.action_document!=="plus"||request.action_revision!==revision||!step||
        !Number.isInteger(request.command_id)||request.command_id<1||!Number.isInteger(request.operation_request_id)||request.operation_request_id<1||
        definition.lifecycle_owner_inlet!==revision+1||!owner||owner.inlet!==revision+1||owner.document!=="plus"||
        owner.revision!==revision||owner.source_sha256!==PLUS_SOURCE||owner.working_path!==definition.working_windows_path||
        !root||root.parentpatcher!==null||!samePath(root.filepath,definition.working_windows_path)||
        definition.basic_anchor!=="root/obj-2"||definition.basic_varname!=="basic_tab")throw Error("plus-v8-request-owner-binding");
    var documents=(configuration.documents||[]).filter(d=>d.document==="plus"&&d.revision===revision);
    if(documents.length!==1||!sameData(documents[0],definition))throw Error("plus-v8-configured-definition-binding");
    var originals=definition.full_inventory.filter(e=>e.anchor.split("/").length===2),boxes=definition.boxes,leaves=definition.observer_leaves||[];
    if(definition.full_inventory.length!==20||originals.length!==4||boxes.length!==16||leaves.length!==19||
        !sameData(originals.map(b=>b.anchor).sort(),Object.keys(PLUS_ROOT_DIAGNOSTIC_PINS).sort()))throw Error("plus-v8-source-inventory-binding");
    var rootInventory=representationObjects(root,8),basic=null,rootMatches=[],rootIdentity=rootInventory.complete&&rootInventory.objects.length===8;
    for(var expected of originals) {
        var pin=PLUS_ROOT_DIAGNOSTIC_PINS[expected.anchor],policy=observedGeometryPolicy(expected,definition,configuration);
        if(!pin||expected.maxclass!==pin.source_class||expected.source_box_sha256!==pin.source_box_sha256||expected.source_text_sha256!==pin.source_text_sha256||
            expected.runtime_class!==pin.runtime_class||!sameData(expected.runtime_classes,pin.runtime_classes)||
            geometryVectorHash(expected.rect)!==pin.saved_rect_sha256)throw Error("plus-v8-source-root-binding");
        var candidates=[],matches=[];
        for(var object of rootInventory.objects) {
            if((object.varname||"")!==(expected.source_varname||""))continue;
            var rect=representationRectangle(object),geometry=rect&&(sameData(rect,expected.rect)||policy&&sameData(rect,policy.live_rect));
            candidates.push({runtime_class:object.maxclass,rect:rect,geometry_matches:!!geometry});if(geometry)matches.push(object);
        }
        var object=rootInventory.complete&&matches.length===1?matches[0]:null;
        if(!object||rootMatches.includes(object))rootIdentity=false;else rootMatches.push(object);
        diagnostic.root_rows.push({anchor:expected.anchor,source_box_sha256:expected.source_box_sha256,source_text_sha256:expected.source_text_sha256,
            source_class:expected.maxclass,expected_runtime_classes:expected.runtime_classes,candidates:candidates,
            candidate_count:object?1:null,observed_candidate_count:matches.length,candidate_count_complete:!!object,
            actual_runtime_class:object?object.maxclass:null,live_rect:object?representationRectangle(object):null});
        if(!object||expected.runtime_classes.indexOf(object.maxclass)===-1)diagnostic.strict_mismatch=true;
        if(expected.anchor==="root/obj-2"&&object)try{basic=object.subpatcher();}catch(error){}
    }
    for(var name of ["__alive_arithmetic_reader","__alive_arithmetic_disposer","__alive_arithmetic_freebang","__alive_arithmetic_lifecycle_send"])
        if(rootInventory.objects.filter(o=>o.varname===name).length!==1)rootIdentity=false;
    var numericInventory=representationObjects(basic,35),numericIdentity=numericInventory.complete&&numericInventory.objects.length===35,byName={},wantedNames=[];
    for(var b of boxes) {
        var saved=definition.full_inventory.filter(e=>e.anchor===b.anchor),keys=["maxclass","runtime_class","runtime_classes","rect","source_box_sha256","source_text_sha256"];
        if(saved.length!==1||b.anchor!=="root/obj-2/"+b.id||keys.some(k=>!sameData(saved[0][k],b[k])))throw Error("plus-v8-basic-source-copy");
        var name="__alive_help_"+b.id.replace(/-/g,"_"),matches=numericInventory.objects.filter(o=>o.varname===name),policy=observedGeometryPolicy(b,definition,configuration);
        wantedNames.push(name);
        var rect=matches.length===1?representationRectangle(matches[0]):null;
        if(matches.length!==1||!rect||!(sameData(rect,b.rect)||policy&&sameData(rect,policy.live_rect)))numericIdentity=false;
        else byName[name]=matches[0];
    }
    var wantedLeaves=[];
    for(var b of boxes)for(var port=0;port<b.outlets;port++)wantedLeaves.push({anchor:b.anchor,port:port,varname:"__alive_help_leaf_"+b.id.replace(/-/g,"_")+"_"+port});
    if(!sameData(wantedLeaves,leaves))throw Error("plus-v8-observer-source-inventory");
    for(var leaf of leaves)wantedNames.push(leaf.varname);
    if(new Set(wantedNames).size!==35)throw Error("plus-v8-source-name-collision");
    for(var name of wantedNames)if(numericInventory.objects.filter(o=>o.varname===name).length!==1)numericIdentity=false;
    diagnostic.inventory_complete=!!rootIdentity&&!!numericIdentity;
    diagnostic.inventory_coverage={};
    for(var pair of [["root",rootInventory,rootIdentity],["numeric",numericInventory,numericIdentity]]) {
        var inventory=pair[1],complete=!!pair[2];
        diagnostic.inventory_coverage[pair[0]]={complete:complete,status:!inventory.complete?inventory.status:complete?"complete":
            inventory.objects.length!==inventory.limit?"count-mismatch":"identity-mismatch",observed_count:inventory.objects.length,
            complete_count:complete?inventory.objects.length:null,limit:inventory.limit};
    }
    if(!diagnostic.inventory_complete) {
        diagnostic.strict_mismatch=true;
        for(var row of diagnostic.root_rows){row.candidate_count=null;row.candidate_count_complete=false;row.actual_runtime_class=null;row.live_rect=null;}
    }
    for(var anchor of Object.keys(PLUS_NUMERIC_PINS)) {
        var expected=boxes.filter(b=>b.anchor===anchor)[0],name="__alive_help_"+expected.id.replace(/-/g,"_"),
            matches=numericInventory.objects.filter(o=>o.varname===name),object=diagnostic.inventory_complete?byName[name]:null,
            rect=object?representationRectangle(object):null,geometry=diagnostic.inventory_complete?!!rect&&sameData(rect,expected.rect):null;
        var probe=geometry?object:{},row={anchor:anchor,source_box_sha256:expected.source_box_sha256,source_text_sha256:expected.source_text_sha256,
            source_class:"flonum",expected_runtime_classes:expected.runtime_classes,candidate_count:diagnostic.inventory_complete?matches.length:null,
            observed_candidate_count:matches.length,candidate_count_complete:diagnostic.inventory_complete,actual_runtime_class:object?object.maxclass:null,
            live_rect:rect,geometry_matches:geometry,probe_disposition:!diagnostic.inventory_complete?"suppressed-incomplete-inventory":geometry?"observed":"source-candidate-unavailable",
            receipt_tag_observed:false,format_observation:capabilityObservation({},"getattr","format"),value_observation:capabilityObservation({},"getvalueof")};
        diagnostic.numeric_rows.push(row);
        if(object&&object.maxclass!=="flonum")diagnostic.strict_mismatch=true;
        if(current)current();row.format_observation=capabilityObservation(probe,"getattr","format");if(current)current();
        row.value_observation=capabilityObservation(probe,"getvalueof");if(current)current();
        if(!object||object.maxclass!=="flonum"||!geometry||row.value_observation.status!=="returned"||
            ["scalar-number","singleton-number-array"].indexOf(row.value_observation.representation)===-1)diagnostic.strict_mismatch=true;
    }
    return diagnostic;
    }catch(error){error.v8_representation_diagnostics=diagnostic;throw error;}
}
function collectRepresentationDiagnostics(root,definition,request,configuration) {
    if(definition.document==="plus")return collectPlusRepresentationDiagnostics(root,definition,request,configuration);
    if(definition.document!=="times")return null;
    var revision=definition.revision,configured={},owner=configuration&&configuration.lifecycle&&
        configuration.lifecycle.owners&&configuration.lifecycle.owners[definition.lifecycle_owner_inlet];
    if(definition.source_sha256!==GEOMETRY_SOURCE||request.source_sha256!==GEOMETRY_SOURCE||
        !sameData(definition.helper_sha256,GEOMETRY_HELPERS)||!configuration||!configuration.helpers||configuration.helpers.length!==4)
        throw Error("v8-representation-source-binding");
    for(var helper of configuration.helpers)configured[helper.name]=helper.sha256;
    var event=/^times-A([0-9]{2})$/.exec(request.step_id),number=event?Number(event[1]):0;
    var step=request.action==="install"?request.step_id==="install-times-r"+revision:
        request.action==="close"?request.step_id==="close-times-r"+revision:
        request.action==="event"&&event&&(revision===1?number>=1&&number<=20:number>=21&&number<=22);
    if(!sameData(configured,GEOMETRY_HELPERS)||(revision!==1&&revision!==2)||
        request.op!==(request.action==="close"?"operation":"readback")||
        request.document!=="times"||request.revision!==revision||request.action_document!=="times"||
        request.action_revision!==revision||!step||!Number.isInteger(request.command_id)||request.command_id<1||
        !Number.isInteger(request.operation_request_id)||request.operation_request_id<1||
        definition.lifecycle_owner_inlet!==revision-1||!owner||owner.document!=="times"||owner.revision!==revision||
        owner.source_sha256!==GEOMETRY_SOURCE||owner.working_path!==definition.working_windows_path||
        !samePath(root.filepath,definition.working_windows_path)||root.parentpatcher!=null)
        throw Error("v8-representation-request-owner-binding");
    var diagnostic={engine:"v8",request_id:request.command_id,operation_request_id:request.operation_request_id,
        step_id:request.step_id,action:request.action,action_document:request.action_document,action_revision:request.action_revision,
        document:"times",revision:revision,source_sha256:GEOMETRY_SOURCE,helper_sha256:GEOMETRY_HELPERS,
        receipt_tag_observed:false,root_rows:[],numeric_rows:[],strict_mismatch:false};
    var originals=definition.full_inventory.filter(function(e){return e.anchor.split("/").length===2;});
    if(originals.length!==4||!sameData(originals.map(function(e){return e.anchor;}).sort(),Object.keys(TIMES_ROOT_REPRESENTATION_PINS).sort()))
        throw Error("v8-source-root-inventory-binding");
    var rootInventory=representationObjects(root,8),basic=null;
    if(!rootInventory.complete)diagnostic.strict_mismatch=true;
    for(var expected of originals) {
        var pin=TIMES_ROOT_REPRESENTATION_PINS[expected.anchor],policy=observedGeometryPolicy(expected,definition,configuration),
            v8Policy=v8RepresentationPolicy(expected,definition,configuration,false);
        if(!pin||expected.source_box_sha256!==pin.source_box_sha256||expected.source_text_sha256!==pin.source_text_sha256||
            expected.runtime_class!==pin.runtime_class||!sameData(expected.runtime_classes,pin.runtime_classes)||
            geometryVectorHash(expected.rect)!==pin.saved_rect_sha256)throw Error("v8-source-root-box-binding");
        var candidates=[],matches=[];
        for(var object of rootInventory.objects) {
            if((object.varname||"")!==(expected.source_varname||""))continue;
            var rect=representationRectangle(object),geometry=rect&&(v8Policy?sameData(rect,v8Policy.live_rect):
                (sameData(rect,expected.rect)||(policy&&sameData(rect,policy.live_rect))));
            candidates.push({runtime_class:object.maxclass,rect:rect,geometry_matches:!!geometry});
            if(geometry)matches.push(object);
        }
        var object=rootInventory.complete&&matches.length===1?matches[0]:null;
        var row={anchor:expected.anchor,source_box_sha256:expected.source_box_sha256,source_text_sha256:expected.source_text_sha256,
            source_class:expected.maxclass,expected_runtime_classes:expected.runtime_classes,
            candidate_count:rootInventory.complete?matches.length:null,observed_candidate_count:matches.length,
            candidate_count_complete:rootInventory.complete,
            candidates:candidates,actual_runtime_class:object?object.maxclass:null,live_rect:object?representationRectangle(object):null};
        diagnostic.root_rows.push(row);
        if(!object||(v8Policy?(object.maxclass!=="jpatcher"||candidates.length!==1):
            expected.runtime_classes.indexOf(object.maxclass)===-1))diagnostic.strict_mismatch=true;
        if(expected.anchor==="root/obj-4"&&object&&typeof object.subpatcher==="function") {
            try{basic=object.subpatcher();}catch(error){}
        }
    }
    var numericInventory=representationObjects(basic,definition.boxes.length+(definition.observer_leaves||[]).length);
    diagnostic.inventory_complete=rootInventory.complete&&numericInventory.complete;
    diagnostic.inventory_coverage={};
    for(var pair of [["root",rootInventory],["numeric",numericInventory]]) {
        var inventory=pair[1];
        diagnostic.inventory_coverage[pair[0]]={complete:inventory.complete,status:inventory.status,
            observed_count:inventory.objects.length,complete_count:inventory.complete?inventory.objects.length:null,limit:inventory.limit};
    }
    if(!diagnostic.inventory_complete) {
        diagnostic.strict_mismatch=true;
        // A bounded prefix cannot establish a unique source binding or a complete count.
        for(var row of diagnostic.root_rows) {
            row.candidate_count=null;row.candidate_count_complete=false;
            row.actual_runtime_class=null;row.live_rect=null;
        }
    }
    for(var anchor of Object.keys(NUMERIC_REPRESENTATION_PINS)) {
        var boxes=definition.boxes.filter(function(b){return b.anchor===anchor;});
        if(boxes.length!==1||(!v8RepresentationPolicy(boxes[0],definition,configuration,true)&&
            !controllerNumericRepresentationPolicy(boxes[0],definition,configuration)))
            throw Error("v8-numeric-diagnostic-source-binding");
        var expected=boxes[0],v8Policy=v8RepresentationPolicy(expected,definition,configuration,true),
            name="__alive_help_"+expected.id.replace(/-/g,"_"),matches=[];
        for(var object of numericInventory.objects)if(object.varname===name)matches.push(object);
        var object=diagnostic.inventory_complete&&matches.length===1?matches[0]:null,rect=object?representationRectangle(object):null;
        var geometry=diagnostic.inventory_complete?!!rect&&sameData(rect,expected.rect):null,probe=geometry?object:{};
        var row={anchor:anchor,source_box_sha256:expected.source_box_sha256,source_text_sha256:expected.source_text_sha256,
            source_class:"flonum",expected_runtime_classes:expected.runtime_classes,
            candidate_count:diagnostic.inventory_complete?matches.length:null,observed_candidate_count:matches.length,
            candidate_count_complete:diagnostic.inventory_complete,
            actual_runtime_class:object?object.maxclass:null,live_rect:rect,geometry_matches:geometry,
            probe_disposition:!diagnostic.inventory_complete?"suppressed-incomplete-inventory":geometry?"observed":"source-candidate-unavailable",
            receipt_tag_observed:false,format_observation:capabilityObservation(probe,"getattr","format"),
            value_observation:capabilityObservation(probe,"getvalueof")};
        diagnostic.numeric_rows.push(row);
        if(!geometry||!object||object.maxclass!==(v8Policy?"number":"flonum")||row.value_observation.status!=="returned"||
            (v8Policy?(row.value_observation.representation!=="scalar-number"||row.format_observation.status!=="returned"||
                row.format_observation.representation!=="scalar-number"||row.format_observation.value!==6||
                (request.action==="install"&&row.value_observation.value!==expected.initial_numeric)):
                (row.value_observation.representation!=="scalar-number"&&row.value_observation.representation!=="singleton-number-array")))
            diagnostic.strict_mismatch=true;
    }
    return diagnostic;
}
function collectRepresentationWitnesses(root,definition,request,configuration,diagnostic) {
    var numeric=definition.boxes.filter(b=>typeof b.v8_numeric_representation_policy!=="undefined"),
        roots=(definition.full_inventory||[]).filter(b=>typeof b.v8_root_representation_policy!=="undefined");
    if(!numeric.length&&!roots.length)return null;
    if(definition.document==="plus")throw Error("plus-v8-private-pass-required");
    diagnostic=diagnostic||collectRepresentationDiagnostics(root,definition,request,configuration);
    if(numeric.length!==3||roots.length!==2||!sameData(numeric.map(b=>b.anchor).sort(),Object.keys(NUMERIC_REPRESENTATION_PINS).sort())||
        !sameData(roots.map(b=>b.anchor).sort(),Object.keys(V8_ROOT_REPRESENTATION_PINS).sort())||
        !diagnostic||diagnostic.strict_mismatch||!diagnostic.inventory_complete||
        diagnostic.inventory_coverage.root.complete_count!==8||
        diagnostic.inventory_coverage.numeric.complete_count!==definition.boxes.length+(definition.observer_leaves||[]).length)
        throw Error("v8-exact-live-witnesses-unavailable");
    var numericRows=numeric.map(b=>{
        var row=diagnostic.numeric_rows.find(r=>r.anchor===b.anchor);
        return {anchor:b.anchor,source_box_sha256:b.source_box_sha256,source_text_sha256:b.source_text_sha256,
            source_class:"flonum",actual_runtime_class:row.actual_runtime_class,live_rect:row.live_rect,
            candidate_count:row.candidate_count,candidate_count_complete:row.candidate_count_complete,
            geometry_matches:row.geometry_matches,receipt_tag_observed:false,
            format_observation:row.format_observation,value_observation:row.value_observation};});
    var rootRows=roots.map(b=>{
        var row=diagnostic.root_rows.find(r=>r.anchor===b.anchor);
        return {anchor:b.anchor,source_box_sha256:b.source_box_sha256,source_text_sha256:b.source_text_sha256,
            source_class:"newobj",actual_runtime_class:row.actual_runtime_class,varname:b.source_varname,live_rect:row.live_rect,
            candidate_count:row.candidate_count,candidate_count_complete:row.candidate_count_complete};});
    return {version:"times-v8-representation-witnesses-v1",engine:"v8",request_id:request.command_id,
        operation_request_id:request.operation_request_id,step_id:request.step_id,action:request.action,
        action_document:request.action_document,action_revision:request.action_revision,document:"times",revision:definition.revision,
        source_sha256:GEOMETRY_SOURCE,helper_sha256:GEOMETRY_HELPERS,working_path:definition.working_windows_path,
        root_is_top_level:true,receipt_tag_observed:false,evidence:V8_REPRESENTATION_EVIDENCE,
        inventory_coverage:diagnostic.inventory_coverage,numeric:numericRows,roots:rootRows};
}
function collectReadback(root,definition,request,configuration) {
    var plusMetadata=plusV8Metadata(definition,configuration);
    plusControllerCohortMetadata(definition,configuration);
    if(request.op!=="readback"||request.document!==definition.document||request.revision!==definition.revision||
        request.source_sha256!==definition.source_sha256||!Number.isInteger(request.command_id)||request.command_id<1||
        (!plusMetadata&&(!samePath(root.filepath,definition.working_windows_path)||root.parentpatcher!=null)))throw Error("checkpoint-owner-binding");
    var pass=createPlusReadbackPass(root,definition,request,configuration,request),
        representation=pass?pass.diagnostic:collectRepresentationDiagnostics(root,definition,request,configuration);
    try {
    if(!pass&&representation&&representation.strict_mismatch)throw Error("strict-v8-original-representation-refused");
    var witnesses=pass?pass.consume():collectRepresentationWitnesses(root,definition,request,configuration,representation);
    var basicBox=pass?null:root.getnamed(definition.basic_varname);if(!pass&&!basicBox)throw Error("basic-unavailable");
    if(pass)pass.check();
    var basic=pass?pass.basic:basicBox.subpatcher(),boxes=[],objects={},inputs=[],outputs=[],messages=[],numeric=[],modes=[];
    for(var o=basic.firstobject;o;o=o.nextobject) {
        var name=o.varname;if(typeof name!=="string"||!name||objects[name])throw Error("box-identity-not-unique");
        objects[name]=o;boxes.push({varname:name,maxclass:o.maxclass,rect:rectangle(o)});
        var cords=o.patchcords;if(!cords||!Array.isArray(cords.inputs)||!Array.isArray(cords.outputs))throw Error("endpoint-inventory-unavailable");
        for(var direction of ["inputs","outputs"])for(var cord of cords[direction]) {
            var edge={source:endpoint(cord.srcobject,cord.srcoutlet),destination:endpoint(cord.dstobject,cord.dstinlet)};
            (direction==="inputs"?inputs:outputs).push(edge);
        }
    }
    for(var b of definition.boxes) {
        var object=objects["__alive_help_"+b.id.replace(/-/g,"_")];if(!object)throw Error("original-unavailable");
        observedGeometryPolicy(b,definition,configuration);
        controllerNumericRepresentationPolicy(b,definition,configuration);
        for(var key of ["annotation_width_policy","observer_policy","shell_height_policy","annotation_geometry_policy","numeric_mode_policy"])
            if(typeof b[key]!=="undefined")throw Error("arithmetic-policy-not-admitted");
        var v8Policy=v8RepresentationPolicy(b,definition,configuration,true);
        if(v8Policy?object.maxclass!=="number":(b.runtime_classes||[b.runtime_class]).indexOf(object.maxclass)===-1)
            throw Error("strict-v8-original-class-refused");
        if(["number","flonum"].indexOf(b.maxclass)!==-1) {
            if(v8Policy) {
                var row=witnesses.numeric.find(r=>r.anchor===b.anchor);
                numeric.push({anchor:b.anchor,class_name:object.maxclass,source_class:"flonum",value:row.value_observation.value,
                    getter_method:"getvalueof",getter_representation:"scalar-number",semantic_tag:"float",
                    semantic_tag_basis:"source-flonum-and-live-v8-format6",receipt_tag_observed:false});
            }else {numeric.push(Object.assign({anchor:b.anchor,class_name:object.maxclass},numericValue(object,b.maxclass)));
                if(pass)pass.check();}
        }
    }
    if(pass){collectBasicRetention(root,definition,request,configuration,witnesses);pass.check();}
    var result={success:true,readback_method:"v8-numeric-getvalueof",request_id:request.command_id,
        operation_request_id:request.operation_request_id,step_id:request.step_id,action:request.action,
        action_document:request.action_document,action_revision:request.action_revision,
        document:definition.document,revision:definition.revision,source_sha256:definition.source_sha256,
        working_root_path:root.filepath,root_is_top_level:true,saved_order_observed:false,
        boxes:boxes,messages:messages,numeric:numeric,numeric_modes:modes,input_routes:inputs,output_routes:outputs,
        ...(witnesses?{v8_representation_witnesses:witnesses}:{})};
    if(pass)pass.check();return result;
    }catch(error){if(representation)error.v8_representation_diagnostics=representation;throw error;}
}
function checkpoint(requestId,stepId) {
    var config=readPrivate(configFile),request=readPrivate(config.command_path),path=request.output_path;
    try {
        var definition=config.documents.find(d=>d.document===documentName&&d.revision===revision);
        if(!definition||requestId!==request.command_id||stepId!==request.step_id)throw Error("checkpoint-request-binding");
        writePrivate(path,collectReadback(this.patcher,definition,request,config));
    }catch(error){writePrivate(path,{success:false,request_id:requestId,error_code:"numeric-readback-refused",
        numeric_mode_observation:error.numeric_mode_observation||null,
        v8_representation_diagnostics:error.v8_representation_diagnostics||null});}
}
function collectBasicRetention(root,definition,request,configuration,witnesses) {
    plusControllerCohortMetadata(definition,configuration);
    if(!Array.isArray(definition.boxes)||!Array.isArray(definition.full_inventory)||
        !Array.isArray(definition.observer_leaves)||!Array.isArray(definition.saved_edges))throw Error("basic-source-inventory-unavailable");
    var rootInventory=representationObjects(root,definition.full_inventory.filter(b=>b.anchor.split("/").length===2).length+4),
        containers=rootInventory.objects.filter(o=>o.varname===definition.basic_varname),basicBox=containers[0];
    if(!rootInventory.complete||containers.length!==1||!basicBox||typeof basicBox.subpatcher!=="function")
        throw Error("basic-container-binding");
    var inventory=representationObjects(basicBox.subpatcher(),definition.boxes.length+definition.observer_leaves.length);
    if(!inventory.complete||inventory.objects.length!==inventory.limit)throw Error("basic-complete-inventory-unavailable");
    var byName=Object.create(null),byId=Object.create(null),byAnchor=Object.create(null),expectedNames=[],leaves=[],boxes=[],inputs=[],outputs=[];
    for(var b of definition.boxes) {
        var name="__alive_help_"+b.id.replace(/-/g,"_");
        if(typeof b.id!=="string"||!b.id||typeof b.anchor!=="string"||byId[b.id]||byAnchor[b.anchor]||expectedNames.includes(name)||
            !Number.isInteger(b.inlets)||b.inlets<0||!Number.isInteger(b.outlets)||b.outlets<0||
            typeof b.authored_text!=="string"||typeof b.authored_empty!=="boolean"||b.authored_empty!==!b.authored_text||
            sourceTextHash(b.authored_text)!==b.source_text_sha256)throw Error("basic-source-text-or-port-inventory");
        for(var key of ["annotation_width_policy","observer_policy","shell_height_policy","annotation_geometry_policy","numeric_mode_policy"])
            if(typeof b[key]!=="undefined")throw Error("arithmetic-policy-not-admitted");
        var saved=definition.full_inventory.filter(e=>e.anchor===b.anchor),keys=["maxclass","runtime_class","runtime_classes",
            "source_box_sha256","source_text_sha256","inlets","outlets","authored_text","authored_empty","rect"];
        if(saved.length!==1||keys.some(key=>!sameData(saved[0][key],b[key])))throw Error("basic-source-descriptor-inventory");
        byId[b.id]=b;byAnchor[b.anchor]=b;expectedNames.push(name);
        for(var port=0;port<b.outlets;port++)leaves.push({varname:"__alive_help_leaf_"+b.id.replace(/-/g,"_")+"_"+port,
            anchor:b.anchor,port:port});
    }
    if(!sameData(leaves,definition.observer_leaves))throw Error("basic-observer-definition-changed");
    for(var leaf of leaves)expectedNames.push(leaf.varname);
    if(new Set(expectedNames).size!==expectedNames.length)throw Error("basic-source-name-not-unique");
    for(var object of inventory.objects) {
        var name=object.varname;
        if(typeof name!=="string"||!name||byName[name]||!expectedNames.includes(name))throw Error("basic-object-identity-changed");
        byName[name]=object;boxes.push({varname:name,maxclass:object.maxclass,rect:rectangle(object)});
    }
    if(Object.keys(byName).length!==expectedNames.length)throw Error("basic-object-inventory-changed");
    for(var b of definition.boxes) {
        var object=byName["__alive_help_"+b.id.replace(/-/g,"_")],policy=observedGeometryPolicy(b,definition,configuration),
            numericPolicy=v8RepresentationPolicy(b,definition,configuration,true),rect=rectangle(object);
        controllerNumericRepresentationPolicy(b,definition,configuration);
        if(object.maxclass!==(numericPolicy?"number":b.runtime_class)||
            !(sameData(rect,b.rect)||(policy&&sameData(rect,policy.live_rect))))throw Error("basic-original-class-or-geometry");
        if(numericPolicy) {
            var rows=witnesses&&witnesses.numeric.filter(r=>r.anchor===b.anchor);
            if(!rows||rows.length!==1||rows[0].actual_runtime_class!==object.maxclass||!sameData(rows[0].live_rect,rect))
                throw Error("basic-live-numeric-witness-binding");
        }
    }
    for(var leaf of leaves)if(byName[leaf.varname].maxclass!=="js")throw Error("basic-observer-class-changed");
    var portInventory=Object.create(null),strictEndpointIdentity=definition.document==="plus"&&
        definition.boxes.some(b=>typeof b.v8_numeric_representation_policy!=="undefined");
    for(var b of definition.boxes)portInventory["__alive_help_"+b.id.replace(/-/g,"_")]={inlets:b.inlets,outlets:b.outlets};
    for(var leaf of leaves)portInventory[leaf.varname]={inlets:1,outlets:0};
    function routeEndpoint(object,port,side) {
        var name=object&&object.varname;
        if(typeof name!=="string"||!byName[name]||(strictEndpointIdentity&&byName[name]!==object)||!Number.isInteger(port)||port<0||
            port>=portInventory[name][side==="source"?"outlets":"inlets"])throw Error("basic-runtime-endpoint-changed");
        return {varname:name,port:port};
    }
    var expectedRoutes=[];
    for(var edge of definition.saved_edges) {
        var s=edge.source,d=edge.destination;
        if(!Array.isArray(s)||s.length!==2||!Array.isArray(d)||d.length!==2||!byId[s[0]]||!byId[d[0]])
            throw Error("basic-saved-endpoint-unavailable");
        expectedRoutes.push({source:routeEndpoint(byName["__alive_help_"+s[0].replace(/-/g,"_")],s[1],"source"),
            destination:routeEndpoint(byName["__alive_help_"+d[0].replace(/-/g,"_")],d[1],"destination")});
    }
    for(var leaf of leaves)expectedRoutes.push({source:{varname:"__alive_help_"+byAnchor[leaf.anchor].id.replace(/-/g,"_"),port:leaf.port},
        destination:{varname:leaf.varname,port:0}});
    for(var object of inventory.objects) {
        var cords=object.patchcords;
        if(!cords||!Array.isArray(cords.inputs)||!Array.isArray(cords.outputs))throw Error("basic-endpoint-inventory-unavailable");
        for(var direction of ["inputs","outputs"])for(var cord of cords[direction]) {
            var routes=direction==="inputs"?inputs:outputs;
            if(routes.length>=expectedRoutes.length)throw Error("basic-endpoint-inventory-overflow");
            routes.push({source:routeEndpoint(cord.srcobject,cord.srcoutlet,"source"),
                destination:routeEndpoint(cord.dstobject,cord.dstinlet,"destination")});
        }
    }
    function routeKeys(routes){return routes.map(r=>JSON.stringify([r.source.varname,r.source.port,r.destination.varname,r.destination.port])).sort();}
    var expectedKeys=routeKeys(expectedRoutes);
    if(!sameData(routeKeys(inputs),expectedKeys)||!sameData(routeKeys(outputs),expectedKeys))throw Error("basic-endpoint-multiset-changed");
    return {version:"arithmetic-basic-retention-v1",request_id:request.command_id,operation_request_id:request.command_id,
        step_id:request.step_id,action:"close",document:definition.document,revision:definition.revision,
        source_sha256:definition.source_sha256,working_path:definition.working_windows_path,basic_varname:definition.basic_varname,
        boxes:boxes,input_routes:inputs,output_routes:outputs};
}
function collectLifecycleProof(root,definition,request,config,progress) {
    var plusMetadata=plusV8Metadata(definition,config);
    if(plusMetadata&&((typeof request.revision!=="undefined"&&request.revision!==definition.revision)||
        (typeof request.action_document!=="undefined"&&request.action_document!==definition.document)||
        (typeof request.operation_request_id!=="undefined"&&request.operation_request_id!==request.command_id)))
        throw Error("plus-v8-original-close-request-binding");
    if(progress)progress.stage="root-binding";
    if(request.op!=="operation"||request.action!=="close"||request.document!==definition.document||
        request.action_revision!==definition.revision||request.source_sha256!==definition.source_sha256||
        !Number.isInteger(request.command_id)||request.command_id<1||(!plusMetadata&&(root.parentpatcher!=null||
        !samePath(root.filepath,definition.working_windows_path))))throw Error("lifecycle-root-binding");
    var owner=config.lifecycle.owners[definition.lifecycle_owner_inlet];
    if(progress)progress.stage="owner-map";
    if(!owner||owner.document!==definition.document||owner.revision!==definition.revision||
        owner.source_sha256!==definition.source_sha256||owner.working_path!==definition.working_windows_path)
        throw Error("lifecycle-owner-map");
    var witnessRequest=Object.assign({},request,{operation_request_id:request.command_id,revision:definition.revision,
        action_document:definition.document}),pass=createPlusReadbackPass(root,definition,witnessRequest,config,request),
        representation=pass?pass.diagnostic:collectRepresentationDiagnostics(root,definition,witnessRequest,config),witnesses;
    try {
        if(!pass&&representation&&representation.strict_mismatch)throw Error("strict-v8-preclose-representation-refused");
        witnesses=pass?pass.consume():collectRepresentationWitnesses(root,definition,witnessRequest,config,representation);
    if(progress)progress.stage="basic-retention";
    var basicRetention=collectBasicRetention(root,definition,request,config,witnesses);
    var expected=[{varname:"__alive_arithmetic_reader",maxclass:"v8",rect:[-3000,-3000,160,133]},
        {varname:"__alive_arithmetic_disposer",maxclass:"thispatcher",rect:[-3100,-3000,100,22]},
        {varname:"__alive_arithmetic_freebang",maxclass:"freebang",rect:[-3200,-3000,100,22],boxtext:"freebang"},
        {varname:"__alive_arithmetic_lifecycle_send",maxclass:"send",rect:[-3400,-3000,200,64],boxtext:"send "+owner.channel}];
    var originals=[],harness=[],inputs=[],outputs=[],identities={},originalDefinitions=
        definition.full_inventory.filter(e=>e.anchor.split("/").length===2);
    function identify(o){
        if(progress)progress.stage="geometry";
        var rect=rectangle(o),found=expected.filter(e=>e.varname===o.varname);
        if(found.length){var e=found[0];
            if(progress)progress.stage="harness";
            if(o.maxclass!==e.maxclass||JSON.stringify(rect)!==JSON.stringify(e.rect)||
                (o.valid!==true&&o.valid!==1)||typeof o.boxtext!=="string"||
                (e.boxtext!==undefined&&o.boxtext!==e.boxtext))throw Error("lifecycle-root-harness");
            return {identity:e.varname,harness:true,rect:rect};}
        if(progress)progress.stage="original";
        found=originalDefinitions.filter(e=>{
            for(var key of ["annotation_width_policy","observer_policy","shell_height_policy","annotation_geometry_policy","numeric_mode_policy"])
                if(typeof e[key]!=="undefined")throw Error("arithmetic-policy-not-admitted");
            var policy=observedGeometryPolicy(e,definition,config),v8Policy=v8RepresentationPolicy(e,definition,config,false);
            return (v8Policy?o.maxclass==="jpatcher":(e.runtime_classes||[e.runtime_class]).includes(o.maxclass))&&
                (o.varname||"")===(e.source_varname||"")&&
                (v8Policy?sameData(rect,v8Policy.live_rect):(sameData(rect,e.rect)||(policy&&sameData(rect,policy.live_rect))));});
        if(found.length!==1)throw Error("lifecycle-root-original");
        return {identity:found[0].anchor,harness:false,rect:rect};
    }
    if(progress)progress.stage="inventory";
    for(var o=root.firstobject;o;o=o.nextobject){var id=identify(o);
        if(progress)progress.stage="inventory";
        if(identities[id.identity])throw Error("lifecycle-root-duplicate");identities[id.identity]=plusMetadata?o:true;
        if(id.harness)harness.push({varname:o.varname,maxclass:o.maxclass,rect:id.rect,boxtext:o.boxtext,valid:o.valid});
        else originals.push({anchor:id.identity,varname:o.varname||"",maxclass:o.maxclass,rect:id.rect});
    }
    if(progress)progress.stage="count";
    if(harness.length!==4||originals.length!==originalDefinitions.length)throw Error("lifecycle-root-count");
    function endpoint(o,port){var id=identify(o);if(!identities[id.identity]||(plusMetadata&&identities[id.identity]!==o)||!Number.isInteger(port)||port<0)
        throw Error("lifecycle-root-endpoint");return {identity:id.identity,port:port};}
    if(progress)progress.stage="patchcords";
    for(var o=root.firstobject;o;o=o.nextobject){var cords=o.patchcords;
        if(!cords||!Array.isArray(cords.inputs)||!Array.isArray(cords.outputs))throw Error("lifecycle-root-cords");
        for(var direction of ["inputs","outputs"])for(var c of cords[direction])
            (direction==="inputs"?inputs:outputs).push({source:endpoint(c.srcobject,c.srcoutlet),destination:endpoint(c.dstobject,c.dstinlet)});
    }
    var edge={source:{identity:"__alive_arithmetic_freebang",port:0},destination:{identity:"__alive_arithmetic_lifecycle_send",port:0}};
    if(progress)progress.stage="routes";
    if(inputs.length!==1||outputs.length!==1||JSON.stringify(inputs[0])!==JSON.stringify(edge)||
        JSON.stringify(outputs[0])!==JSON.stringify(edge))throw Error("lifecycle-root-routes");
    if(pass)pass.check();
    var result={version:"arithmetic-freebang-v1",request_id:request.command_id,step_id:request.step_id,document:definition.document,
        revision:definition.revision,source_sha256:definition.source_sha256,working_path:root.filepath,
        root_is_top_level:true,originals:originals,harness:harness,input_routes:inputs,output_routes:outputs,basic_retention:basicRetention,
        ...(witnesses?{v8_representation_witnesses:witnesses}:{})};
    if(pass)pass.check();return result;
    }catch(error){if(representation)error.v8_representation_diagnostics=representation;throw error;}
}
function rootDiagnosticValue(value,depth){
    var type=value===null?"null":Array.isArray(value)?"array":typeof value,result={type:type};
    if(type==="string"){
        result.value=value.slice(0,256);
        if(value.length>256){result.truncated=true;result.length=value.length;}
    }else if(type==="boolean")result.value=value;
    else if(type==="number"){
        if(Number.isFinite(value))result.value=value;
        else result.representation=Number.isNaN(value)?"nan":value>0?"positive-infinity":"negative-infinity";
    }else if(type==="array"){
        result.length=value.length;result.items=[];
        var count=depth>=1?0:Math.min(value.length,16);
        for(var index=0;index<count;index++)result.items.push(rootDiagnosticRead(()=>value[index],1));
        if(count<value.length)result.truncated=true;
    }
    return result;
}
function rootDiagnosticException(error,compact){
    var result={status:"threw"};
    try{result.exception=rootDiagnosticValue(error,compact?1:0);}catch(ignored){result.exception={type:typeof error,unavailable:true};}
    for(var key of ["name","message"])try{
        var value=error[key];if(typeof value==="string"){
            result[key]=value.slice(0,256);if(value.length>256)result[key+"_truncated"]=true;
        }
    }catch(ignored){}
    return result;
}
function rootDiagnosticRead(read,depth){
    try{return Object.assign({status:"returned"},rootDiagnosticValue(read(),depth||0));}
    catch(error){return rootDiagnosticException(error);}
}
function lifecycleFailureDiagnostics(root,stage,error){
    var objects=[],harnessClasses={"__alive_arithmetic_reader":"v8","__alive_arithmetic_disposer":"thispatcher",
        "__alive_arithmetic_freebang":"freebang","__alive_arithmetic_lifecycle_send":"send"};
    var scan=rootDiagnosticRead(()=>{
        var object=root.firstobject,count=0;
        while(object&&count++<16){var current=object,varname=rootDiagnosticRead(()=>current.varname);
            var row={varname:varname,maxclass:rootDiagnosticRead(()=>current.maxclass),
                patching_rect:rootDiagnosticRead(()=>current.getboxattr("patching_rect"))};
            if(varname.status==="returned"&&varname.type==="string"&&!varname.truncated&&
                row.maxclass.status==="returned"&&row.maxclass.type==="string"&&!row.maxclass.truncated&&
                Object.prototype.hasOwnProperty.call(harnessClasses,varname.value)&&harnessClasses[varname.value]===row.maxclass.value){
                row.boxtext=rootDiagnosticRead(()=>current.boxtext);row.valid=rootDiagnosticRead(()=>current.valid);
            }
            objects.push(row);object=object.nextobject;
        }
        return !object;
    });
    return {stage:stage,error:rootDiagnosticException(error),bounds:{objects:16,string_characters:256,
        array_items:16,array_depth:1,ascii_json_bytes:24000},root_objects:objects,scan:scan};
}
function lifecycleproof(requestId,stepId) {
    var config=readPrivate(configFile),request=readPrivate(config.command_path);
    var definition=config.documents.find(d=>d.document===documentName&&d.revision===revision);
    if(!definition)throw Error("lifecycle-definition");
    var path=config.lifecycle.owners[definition.lifecycle_owner_inlet].root_proof_path;
    var progress={stage:"request"};
    try{
        if(requestId!==request.command_id||stepId!==request.step_id)throw Error("lifecycle-proof-request");
        var proof=collectLifecycleProof(this.patcher,definition,request,config,progress);
        progress.stage="write";writePrivate(path,proof);
    }catch(error){
        var failure={success:false,request_id:requestId,error_code:"lifecycle-root-proof-refused",
            v8_representation_diagnostics:error.v8_representation_diagnostics||null};
        try{
            var diagnostic=lifecycleFailureDiagnostics(this.patcher,progress.stage,error);
            failure.failure_diagnostics=diagnostic;
            // Bound the complete failure line below Max's observed single-line transport limit.
            function bytes(){return JSON.stringify(failure).replace(/[\u007f-\uffff]/g,"\\u0000").length;}
            while(bytes()>24000&&diagnostic.root_objects.length){
                diagnostic.root_objects.pop();diagnostic.omitted_objects=(diagnostic.omitted_objects||0)+1;
            }
            if(bytes()>24000)throw Error("lifecycle-diagnostics-size");
        }catch(diagnosticError){
            // Omitting fallback array items bounds both exceptions independently of the failed diagnostic scan.
            failure.failure_diagnostics={stage:progress.stage,error:rootDiagnosticException(error,true),
                diagnostics_error:rootDiagnosticException(diagnosticError,true)};}
        writePrivate(path,failure);
    }
}
