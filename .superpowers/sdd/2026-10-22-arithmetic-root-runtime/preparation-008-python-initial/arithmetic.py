#!/usr/bin/env python3
"""Finite arithmetic Max preparation; full source and observations stay private."""
from collections import Counter
import copy
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import secrets
import stat

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
PREVIOUS = ROOT.parent / 'help-roots-runtime-20261022'
SCORE = ROOT / 'score.json'
SCORE_SHA256 = '95012c9d56bc898d32b055d2f6d7fc925cac19afc4a18af254f7a3c871b67afb'
spec = importlib.util.spec_from_file_location('arithmetic_reference_common', PREVIOUS / 'help_runtime.py')
common = importlib.util.module_from_spec(spec)
spec.loader.exec_module(common)
digest = common.digest
windows_path = common.windows_path
original_varname = common.original_varname
observer_definitions = common.observer_definitions
NUMERIC = {'number', 'flonum'}
IDENTITIES = {
    'times': '1eea3861a1605453fb3ed4daa4660f71e175fb2cf16ce4c4098cb53c5b94d54b',
    'plus': 'd1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895',
    'minus': '7968c6cf7d348b39d8fb8044c42977bc2b71fe55c4c7db8542150e79e6a1a0b0'}
SOURCE_BYTES = {'times': 22249, 'plus': 22248, 'minus': 22246}
CLASSES = {'times': '*', 'plus': '+', 'minus': '-'}
BASIC = {'times': 'root/obj-4', 'plus': 'root/obj-2', 'minus': 'root/obj-2'}
QUESTION = {'times': 'root/obj-1', 'plus': 'root/obj-3', 'minus': 'root/obj-3'}
ROLES = {'integer_operator': ('obj-26', 'newobj'), 'integer_hot': ('obj-17', 'number'),
    'integer_cold': ('obj-16', 'number'), 'integer_recall': ('obj-22', 'button'),
    'integer_display': ('obj-25', 'number'), 'float_operator': ('obj-10', 'newobj'),
    'float_hot': ('obj-1', 'flonum'), 'float_alternate_hot': ('obj-7', 'number'),
    'float_cold': ('obj-24', 'flonum'), 'float_display': ('obj-23', 'flonum')}
HELPERS = {
    'helpstarter.js': 'a72853ae6e4593e9ed183e41a59f40e0454162c04ca8a9185648332baf8eeac8',
    'helpname.js': '49d1091a240f0a2926609462bd82cc7449527a2aadfd748238a5c593aedd12aa',
    'helpdetails.js': '31899d95bdc2dfcb45b1e0a4922a387351131479520992d15c225a594769aea1',
    'helpargs.js': '04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469'}
SHELL_HELPERS = HELPERS
HELPER_ANCHORS = {
    'times': ('root/obj-3', 'root/obj-6', 'root/obj-4/obj-2', 'root/obj-4/obj-5'),
    'plus': ('root/obj-1', 'root/obj-4', 'root/obj-2/obj-2', 'root/obj-2/obj-4'),
    'minus': ('root/obj-1', 'root/obj-4', 'root/obj-2/obj-2', 'root/obj-2/obj-4')}
HELPER_ARGUMENT_HASHES = {
    'times': ('684888c0ebb17f374298b65ee2807526c066094c701bcc7ebbe1c1095f494fc1',) * 2,
    'plus': ('a318c24216defe206feeb73ef5be00033fa9c4a74d0b967f6532a26ca5906d3b',
             '383ef36928344f56ffe8fe23ceed2ad8c0db8ec222c5f56c47163747dc738a0e'),
    'minus': ('3973e022e93220f9212c18d0d0c543ae7c309e46640da93a4a0314de999f5112',
              '129fa7713adba71e12dca1d217e4236dad4fd946a80ea339180c243e1c7888da')}
STARTER_HASHES = {'times': '0ca81c69553c5299b7dc137769cb0887e0f1dc26c73bfe08c0e04891d8a99d02',
    'plus': 'e86f190fbc376badcc5d7b14a552d4e84fad436e0789bb2c7cc221fa38bf9390',
    'minus': '490326e775bc3adc514c502064cb4b937c4122d2450e8b62c85f583077795a37'}
OPERATOR_HASHES = {
    'times': ('64b5eb5de415bf479817dc8f26c6e8b663360ef0b51213a4e373e83451586c83',
              'd9b9f4eb4114a78bacfa73eeced5fee6a87084f115f6a8874ce72735b49ef02f'),
    'plus': ('946eb99b2d46c8d1b5b684f81a8d51459e44860f734fd0691d925b238886c236',
             '6e21ff328a68f4b336f90954873c129127e2f379bccdffda94f292f26758ebb5'),
    'minus': ('4f5450721ae52377bbd0fd626ee048bde869ec3b1b37f2d3c17fe47dd9aeb829',
              '726777f34732977bd5ab08b0fc23ca2e1f591d9f8c17ce75670e736153cc086b')}
# Capture001 records times-only geometry; no numeric format capability was observed.
GEOMETRY_SOURCE = '1eea3861a1605453fb3ed4daa4660f71e175fb2cf16ce4c4098cb53c5b94d54b'
GEOMETRY_EVIDENCE = {'ack_sha256': '8a9b1405f0e5b6cc0706c57c54660777d73736eafb5281025fcd17f9f0addaeb', 'config_sha256': 'a6512b968a0637b93752b446ebfc5c4ab86f0cb6c006b22272ec52f9091c3cff', 'seal_sha256': '34634c43ab942f092fe2f2ccc66e4ea987ca9c5e78d7649cc7d026e728ab9070', 'manifest_sha256': '65ad2d5c90b185f4c89ca512274cf61682ab2ca9e939b79f52d8234e61c6c0b3', 'rea_evidence_id': 'ev_a9118e14891b1c344fa246dcb7663ea520d23df9c742ffc3dd450a6289a37098'}
TIMES_GEOMETRY_PINS = {'root/obj-3': {'runtime_class': 'js', 'changed_dimension': 3, 'source_box_sha256': 'c7355e6a1bd3aef210bfd59ead9d88a6faa6c3aaba8fb2eda9ccbaa5accf6ec9', 'source_text_sha256': '0ca81c69553c5299b7dc137769cb0887e0f1dc26c73bfe08c0e04891d8a99d02', 'saved_rect_sha256': '4814549a20cdea1cfbb09260659e96090b0f19f029fd07d1405c2a48d7288f69', 'live_rect_sha256': 'db4ae3c63db9fecef333bf4657bce3104026f6484bd5ab0edd0bc53c328ecd7e'}, 'root/obj-4': {'runtime_class': 'patcher', 'changed_dimension': 3, 'source_box_sha256': '339c2bd0981f0070983da5a867fef9356a4a992df87739ff60b05a946df309fc', 'source_text_sha256': '484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393', 'saved_rect_sha256': 'd354caae9baa0021746491027a9c4aa1da57065450298612fc0a7b77682b0ceb', 'live_rect_sha256': '6dff8399adb73f3c4d2f1e05a7407d37381968cd2b51bdbb9eb2cc5ee9f849d3'}, 'root/obj-4/obj-5': {'runtime_class': 'jsui', 'changed_dimension': 2, 'source_box_sha256': 'eb55b6bacadd9290ad4ee92a7d298d2145bb0c4107afc28a60405c9d40bfa247', 'source_text_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'saved_rect_sha256': 'fc417b56433ec311af6d252074e5992d7ba6210f706e1ae5fd1f9982d385996c', 'live_rect_sha256': '9feebcd05aba863038f477eeded7fe885e0634d3e796d765969fdd55cecc478c'}, 'root/obj-1': {'runtime_class': 'patcher', 'changed_dimension': 3, 'source_box_sha256': 'ae8f1b27f351f9a4adb1997619d3b70f80666212c66402864934e5c5b753ab6e', 'source_text_sha256': 'bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a', 'saved_rect_sha256': 'd9aad27455a8969fb33a22e3689241f29c2d83d1eac360baf98c043f897e0e86', 'live_rect_sha256': '1b3974a5eef49edf4381887e103169ef36e333facb4d2ccab310ef62ea699926'}}
# Capture004 plus-only identities; measured vectors remain private.
PLUS_SOURCE = 'd1443c5af7ba8874c7b1d237e3d22bbe518970ad8ae85a09ec8f10494d084895'
PLUS_EVIDENCE = {'ack_sha256': 'ed2fe5493d43ee8d00ee06cb76bd39bf5ddbbe00723e9b8ed62730ab66394cd6', 'config_sha256': 'cc06829fbbd1e0e89888152e0f2d4407df5a4e9a3817d7aa7e3a1a40e5ac74fb', 'seal_sha256': 'c3f37c41129eead48fc0f97597731d2c9e3ae3596746ee8d9551ee89d0426e5c', 'command_sha256': '7a53e382e6d67241fef6ac8e313f76986896991c789971b5f7c2d1b3cdf93261', 'manifest_sha256': '9b00b30ab36278e5e387bdac9deeb42364fdfa2948cf902be0a015488a04cd11', 'package_sha256': '22d237c6efd59c8aa87acad901da09028999e369d62c89deb1cc3fe646da177a', 'rea_evidence_id': 'ev_ebf222bc4a6c33847e6667ce57f8dffcf8eb185e38e981a0efbfee44492f47a1', 'audit_sha256': '925a70d2cda0811794b03eb8f59ff76127ccfed10c0c843b36f368550ba88c53'}
PLUS_GEOMETRY_PINS = {'root/obj-1': {'source_box_sha256': 'c4af8c73939eab75ed8940ff6b03159859ca0a782cd411601e0ea594db29d8e2', 'source_text_sha256': 'e86f190fbc376badcc5d7b14a552d4e84fad436e0789bb2c7cc221fa38bf9390', 'saved_rect_sha256': '7c282ca427b38aa6bf81f9155d70ce5720fd0f12f6ab4ef4da21f6441c947cd6', 'runtime_class': 'js', 'changed_dimension': 3, 'live_rect_sha256': 'da868357a7d43088775aeb0784d73cae93002d63fcabbd3ceddd53521cd20e84'}, 'root/obj-2': {'source_box_sha256': 'bbc5fe757f0ef027839d4a09709a97b50451ae9a5fec7d7f38aa810d53ce9f92', 'source_text_sha256': '484a245125c7a3ab76b61a83ed79fdc0813b1a62af7c2405ac22e0fc55c7d393', 'saved_rect_sha256': 'd354caae9baa0021746491027a9c4aa1da57065450298612fc0a7b77682b0ceb', 'runtime_class': 'patcher', 'changed_dimension': 3, 'live_rect_sha256': '6dff8399adb73f3c4d2f1e05a7407d37381968cd2b51bdbb9eb2cc5ee9f849d3'}, 'root/obj-2/obj-4': {'source_box_sha256': 'd9b8da7ef51019bd5837726c704eda09de39cffe89f08bd61e32811cde5acd0f', 'source_text_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'saved_rect_sha256': 'a421ba89c6cd1917427e84dbab006bf66255f8cf04f84b0b83de8c6c6b4646d2', 'runtime_class': 'jsui', 'changed_dimension': 2, 'live_rect_sha256': 'ef478f664cd641a901af80ccc3be0b0f9a1388d863a267d636bdb72fd1a5908a'}, 'root/obj-3': {'source_box_sha256': '310417ef44ee7139be2082fc5bbc63c5a65dfa5d10ab54894b29fe164b84c100', 'source_text_sha256': 'bebf7c3258d1aa320e962f4d3258a831cd0ca12c2d69b5aab221d67d7fefc52a', 'saved_rect_sha256': 'd9aad27455a8969fb33a22e3689241f29c2d83d1eac360baf98c043f897e0e86', 'runtime_class': 'patcher', 'changed_dimension': 3, 'live_rect_sha256': '1b3974a5eef49edf4381887e103169ef36e333facb4d2ccab310ef62ea699926'}}
PLUS_NUMERIC_PINS = {'root/obj-2/obj-1': {'source_box_sha256': 'c873e45cc1ebc4c71b93a736b509fc0f622d4764df74edb3a21f5bad4d999a78', 'source_text_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'saved_rect_sha256': '97bd3d008866faa2c6cdc5bf0de64333c64bd29bf79bae29b6ae070ec6823267'}, 'root/obj-2/obj-24': {'source_box_sha256': 'd84cf4a6a5daa8db1d4b2616b5c1f94385a15d274a80be64ca07ddcb728d8cb3', 'source_text_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'saved_rect_sha256': '14acfb0d484e461a00397ecfb34329cfe8167d5e47b6360edbd54f0fabbd91bc'}, 'root/obj-2/obj-23': {'source_box_sha256': '5b0e92ade41a0633d5d5dc178c9fd1ebc519f7014d331e4a924afff0dfe07982', 'source_text_sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'saved_rect_sha256': '38b2cd4242257c9f9802ef997eccb7d32e451c1b05f37868136baa42fb89636c'}}
# Capture006 is an incomplete controller trace, with no install ACK or V8 admission.
PLUS_CONTROLLER_COHORT_PINS = {anchor: dict(pin,
    initial_numeric_sha256='1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121')
    for anchor, pin in PLUS_NUMERIC_PINS.items()}
PLUS_CONTROLLER_COHORT_BINDING = '31e249de8a69dd317ae9b50f93bca88e3da8392edda68dd7b66865e6a0c98a89'
PLUS_CONTROLLER_COHORT_FORMAT_SHA256 = 'dcdadd560ab2234a2bf2d2b5ed44e5d7640e88eefe6bdbc98aa84aaf31649983'
PLUS_CONTROLLER_COHORT_HISTORY_MAP_SHA256 = 'c6132cd1dc86becaad8b129a41dfe9a8bf778edc95bc6351f917e7fcabcefc9c'
PLUS_CONTROLLER_COHORT_COMMAND_SHA256 = '7a53e382e6d67241fef6ac8e313f76986896991c789971b5f7c2d1b3cdf93261'
PLUS_CONTROLLER_COHORT_OBSERVATION_SHA256 = {
    'getattr': '1a66370eea964e643299a17b32c10e81a91757360fcec24b5ba08c16f7b85710',
    'getvalueof': '2aac570e7076cb6271561b1eb337b2852262955ae09001c25a63b9ba6a5caf4c'}
PLUS_CONTROLLER_COHORT_EVIDENCE = dict(
    trace_sha256='2b3287e45de1123f8ac7582544aa13da5dbfba6650d2aa33e7a46b5f8be39a63',
    trace_role='incomplete-install-prefix', observed_revision=1,
    config_sha256='4a922bf0b1e2d2c5755eb339d0fa8e73a4139f74c5acc3b92352388e85a167ad',
    seal_sha256='3e5b31cdcb62618e08444d35c2ec20815cf07a21aad86de4d058ca6a94170935',
    manifest_sha256='c4fc2bf8badc5cfc98b85d2b1bc8dad9cd7df42f730665521080631ecefad898',
    controller_sha256='c0b0a45ef7a72a484fa976774f5a10e1ca9fcf6892603f723fb7df6c220a3d97',
    historical_binding_sha256='bce1edf4484c73bf95a5c1c1648ff7e7f8f3ce479fe96c92be6639fa6e466df6',
    package_sha256='b140eddbac9d134e162ff4cfdf2388be1285cf45b9127bd8bcc0d253ff0e99e5',
    audit_sha256='9ded6e777503d6181120dc92c3f4745ec4eb565e5a6f29e9bd52c38755870e8d',
    investigation_sha256='7b555ff81a58e426185fb9fca93b23216e18cf0205a8a923b3ca70c892e3e54b',
    verification_sha256='081856c4f782f6c1603d998e6637c2355c84585635c7a3deca980e1b1cce2bfc',
    rea_evidence_id='ev_a0ed6947bdad1fbe7e7ba19b62634a570fdff7803e7db65363b019dd0db409c8')
TIMES_NUMERIC_PINS = {'root/obj-4/obj-1': '3c1b5b23cac75bca82bf1aa6c7c161ca91e8e050d41c2fed4549959291d45360', 'root/obj-4/obj-24': 'd46ddd6aff2b7184bce9a8b1218416dcb47db543026c78a533139b289cb73b42', 'root/obj-4/obj-23': 'f122ac20a6bf9ecec78a24a73a0cbd911d938b441439337f9298ae4dfbcc853c'}
NUMERIC_REPRESENTATION_EVIDENCE = {'ack_sha256': '47764e9dac8f1ec69514509e22e93849e6d8d9a13783c60843757d8a0a3fb22a',
    'config_sha256': '801e50b51d1055791cc07221776ebeaf1c1d755088a36c86d05722a3cfb94ec3',
    'seal_sha256': 'cdfd0f740b0705af080b6bff21d7ace7004bb94bc0713addd99e1eebf84b084d',
    'manifest_sha256': '40bca79b06ddbbcd8644fca527e4240fab68f79b7acc8b526a6467399c562616',
    'rea_evidence_id': 'ev_51b14ef10881b6c5b881216a7fd4fa1b0f0c5c5e8bc05f75694dcbc9c4426d5d'}
NUMERIC_REPRESENTATION_PINS = {
    'root/obj-4/obj-1': dict(source_box_sha256=TIMES_NUMERIC_PINS['root/obj-4/obj-1'],
        source_text_sha256='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        saved_rect_sha256='be69f9cbfae7d8916a7697c10b45556c60dab2bf806f472f39a1f743c6b71562',
        initial_numeric_sha256='1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121'),
    'root/obj-4/obj-24': dict(source_box_sha256=TIMES_NUMERIC_PINS['root/obj-4/obj-24'],
        source_text_sha256='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        saved_rect_sha256='3ae5be738626430c7205dcb01a2fba671d0f93a83677c43e9ba362422cdd0754',
        initial_numeric_sha256='1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121'),
    'root/obj-4/obj-23': dict(source_box_sha256=TIMES_NUMERIC_PINS['root/obj-4/obj-23'],
        source_text_sha256='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        saved_rect_sha256='6172628b9bf9e972a77a1773539e5ffe75c0b592876ec787c48026a2e90b89f2',
        initial_numeric_sha256='1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121')}
V8_REPRESENTATION_EVIDENCE = dict(
    raw_sha256='b3c8518d4d2930f2d18c3066e9ace27038f7893d4ae3644a6d002d99b56a71d6',
    ack_sha256='ae28ae272f4fe7743c121f5f8aacdc28026e29256bf9b4cdef31c0fa10ad08be',
    config_sha256='a406709cab7224f3d297baa14de204565407e4572eadd6c7c0c3d6166ef46fe5',
    seal_sha256='3ab64f6487e0a5f182acd9623728df66664e355472216fdad98545d9753cf5fa',
    manifest_sha256='357e4296de98f953faae2a17bded5a4df66fe5438ee3b4a23ea5ada00f41260c',
    rea_evidence_id='ev_de849ca377d9aa0cada5598c4443c3f57f501c23b073fa1430f610873112f8cd',
    audit_sha256='0102fdaea0e0ee5bcd2e77217b25aef4c467b53124d27bca3426759f5c9fe1b1')
V8_ROOT_REPRESENTATION_PINS = {anchor: {key: value for key, value in TIMES_GEOMETRY_PINS[anchor].items()
    if key in {'source_box_sha256', 'source_text_sha256', 'saved_rect_sha256', 'live_rect_sha256'}}
    for anchor in ('root/obj-4', 'root/obj-1')}
V8_SOURCE_ROOT_PINS = {anchor: dict(source_box_sha256=pin['source_box_sha256'], source_text_sha256=pin['source_text_sha256'],
    runtime_class=pin['runtime_class'], runtime_classes=['patcher', 'p'] if pin['runtime_class'] == 'patcher' else [pin['runtime_class']],
    saved_rect_sha256=pin['saved_rect_sha256']) for anchor, pin in TIMES_GEOMETRY_PINS.items() if anchor.count('/') == 1}
V8_SOURCE_ROOT_PINS['root/obj-6'] = dict(source_box_sha256='5562fc5360aa673a78e47e08bba066124d3ef242ee7484a0c59c1b30bbb5e5a1',
    source_text_sha256='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', runtime_class='jsui', runtime_classes=['jsui'],
    saved_rect_sha256='54f83aaab9e2c42a561a2ccf3d705fb635c1c363d5ee0f1cac7a33a87d7debb9')
PACKAGE_FILES = ('arithmetic.py', 'controller.js', 'observer.js', 'v8-readback.js',
    'lifecycle.py', 'lifecycle-observer.js', 'prepare-runtime.py',
    'test_preparation.py', 'test_helpers.cjs', 'test_lifecycle.py')
NO_POLICIES = {'annotation_width_policy', 'observer_policy', 'shell_height_policy',
    'annotation_geometry_policy', 'numeric_mode_policy'}

# Capture007 remains failed diagnostic provenance, never a live admission proof.
PLUS_V8_EVIDENCE = dict(
    raw_sha256='87459a07efa7a7f8d0bdcaba10148f138369d080104324e520cc7fb1aaf1fd71',
    install_ack_sha256='ba39c2e9b59c9983d938cb8e500f05aef3b82af830558548e50ef97d31df1a82',
    readback_ack_sha256='1c4dcdb18ed66194264e9fbfe914664c636ab066375636647cb4d3038fb62f01',
    command_sha256='be98938644e0ee42eabb329709effcc5ce40d32c6007ee4e139f6856ce7eab28',
    config_sha256='eb44b4930d0bb2504f9739367dad7b144c12b1baada9ac8d37f8bde127ae550b',
    seal_sha256='cedafaa9aa57b066b7fa19b95580c08b884ef2267bec42c6143429bbd41a9641',
    manifest_sha256='73b623f8893e5758f8f74cbc4c41f599e291c12cb9d3a662c572d55fcc40bc7f',
    historical_binding_sha256='97a59c54d9185b47c417c876b12ac8b8ebc4734bb80ad7b439e6e5790aaf991b',
    historical_files_sha256='f01f727c2f17b10175de23da47a536e6a10f19d609bb7d0e92add241811fedac',
    package_sha256='121d5aa5e3056337306bbe2d7a2771221f53e7adb9750572d934d20ac8a8c978',
    controller_sha256='da4473ac8014f39fd255b830121508738c16980b6e303fb0a9b8c963ce0f13a8',
    reader_sha256='7d857163d254c82ecbc02b6cd3ff43be1fdf9f67ed09ddf6eb554a7d87c175fa',
    trace_sha256='bc0e23dc19b130b4bcfe09777a74e56a48f62a9d39860cae7fdc8d3e1a837185',
    audit_sha256='2e96fed0d6acd58fff7b033a17294c1ccc54e15a56590862a142fe723eac704e',
    investigation_sha256='dacc776b2429cab7f76f44a589a131cc3b89dd624afbc25c2c85b98116a62d12',
    rea_evidence_id='ev_c19e98841d00f4654a6c405a8d80067f1d966cf11a11106234b93a05a70c13a5',
    observation_role='failed-install-readback-diagnostics', observed_revision=1, observed_request_id=52,
    observed_operation_request_id=51, raw_success=False, raw_error_code='numeric-readback-refused', observed_strict_mismatch=True)
PLUS_V8_RAW_BYTES = 5350
PLUS_V8_PROJECTION_SHA256 = 'ba8d3d1ec23265bd75f16641fa95668466888d4033811fda95bcdef757da600f'
PLUS_V8_FORMAT_SHA256 = 'dcdadd560ab2234a2bf2d2b5ed44e5d7640e88eefe6bdbc98aa84aaf31649983'
PLUS_V8_NUMERIC_PINS = {anchor:dict(pin, initial_numeric_sha256=
    '1c10b03518fff8fc374a20bbf5107c66496656bec0662d6c6db123d4a898f121') for anchor,pin in PLUS_NUMERIC_PINS.items()}
PLUS_V8_ROOT_PINS = {anchor:{key:pin[key] for key in ('source_box_sha256','source_text_sha256','saved_rect_sha256','live_rect_sha256')}
    for anchor,pin in PLUS_GEOMETRY_PINS.items() if anchor in ('root/obj-2','root/obj-3')}
PLUS_V8_SOURCE_ROOT_PINS = {anchor:dict(pin, maxclass='newobj',runtime_classes=['patcher','p'] if pin['runtime_class']=='patcher' else ['js'])
    for anchor,pin in PLUS_GEOMETRY_PINS.items() if '/' not in anchor[5:]}
PLUS_V8_SOURCE_ROOT_PINS['root/obj-4'] = dict(maxclass='jsui',runtime_class='jsui',runtime_classes=['jsui'],
    source_box_sha256='bff84f2c0e682d712f384b4d5f73017bcc936392a7d0b981ec4ef8ef7a3deb29',
    source_text_sha256='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    saved_rect_sha256='54f83aaab9e2c42a561a2ccf3d705fb635c1c363d5ee0f1cac7a33a87d7debb9',
    live_rect_sha256='54f83aaab9e2c42a561a2ccf3d705fb635c1c363d5ee0f1cac7a33a87d7debb9')
PLUS_BOX_KEYS = frozenset(('id','anchor','maxclass','runtime_class','runtime_classes','rect','inlets','outlets',
    'authored_text','authored_empty','initial_numeric','role','source_box_sha256','source_text_sha256'))
PLUS_FULL_KEYS = frozenset(('anchor','maxclass','runtime_class','runtime_classes','rect','child','source_varname','inlets','outlets',
    'authored_text','authored_empty','source_text_sha256','source_box_sha256','saved_incoming_routes','saved_outgoing_routes'))


def _schema(value, keys, context):
    if type(value) is not dict or set(value) != set(keys): raise ValueError(context + ' schema changed')


def _same(actual, expected, context):
    if canonical(actual) != canonical(expected): raise ValueError(context + ' changed')


def _source_canonical(value):
    def normalize(item):
        if type(item) is dict:return {k:normalize(v) for k,v in item.items()}
        if type(item) is list:return [normalize(v) for v in item]
        if type(item) is float:
            if not finite(item):raise ValueError('Nonfinite source projection')
            if item == math.trunc(item):return int(item)
        return item
    return canonical(normalize(value))


def plus_v8_source_projection(document):
    """Project pristine fields while validating every permitted metadata addition."""
    if document.get('document') != 'plus' or document.get('source_sha256') != PLUS_SOURCE or document.get('helper_sha256') != HELPERS:
        raise ValueError('Plus source projection binding changed')
    if 'revision' in document and (type(document['revision']) is not int or document['revision'] not in (1,2)):
        raise ValueError('Plus source revision changed')
    views={}
    for view,keys in (('boxes',PLUS_BOX_KEYS),('full_inventory',PLUS_FULL_KEYS)):
        entries=document.get(view)
        if type(entries) is not list:raise ValueError('Plus source view unavailable')
        projected=[]
        for b in entries:
            if type(b) is not dict:raise ValueError('Plus source descriptor unavailable')
            allowed=set(keys);anchor=b.get('anchor')
            if anchor in PLUS_GEOMETRY_PINS:
                allowed.add('observed_geometry_policy')
                if view=='boxes':allowed.update(('saved_incoming_routes','saved_outgoing_routes'))
                if view=='boxes' and any(k in b and (type(b[k])is not int or b[k]!=0)for k in ('saved_incoming_routes','saved_outgoing_routes')):
                    raise ValueError('Plus geometry source route count type changed')
                if 'observed_geometry_policy' in b:validate_geometry_policy(document,b,b['observed_geometry_policy'])
            if anchor in PLUS_CONTROLLER_COHORT_PINS:
                allowed.add('plus_controller_numeric_cohort_policy')
                if view=='full_inventory':allowed.add('initial_numeric')
                if 'plus_controller_numeric_cohort_policy' in b:validate_plus_controller_cohort_policy(document,b,b['plus_controller_numeric_cohort_policy'])
            if anchor in PLUS_V8_NUMERIC_PINS:allowed.add('v8_numeric_representation_policy')
            if view=='full_inventory' and anchor in PLUS_V8_ROOT_PINS:allowed.add('v8_root_representation_policy')
            if not keys.issubset(b) or set(b)-allowed:raise ValueError('Plus source descriptor fields changed')
            if view=='boxes' and (type(b['id']) is not str or anchor!='root/obj-2/'+b['id']):raise ValueError('Plus Basic anchor/id changed')
            for k in ('inlets','outlets'):
                if type(b[k]) is not int or b[k]<0:raise ValueError('Plus source port type changed')
            if type(b['authored_empty']) is not bool:raise ValueError('Plus source empty type changed')
            if view=='full_inventory':
                if type(b['child']) is not bool or any(type(b[k]) is not int or b[k]<0 for k in ('saved_incoming_routes','saved_outgoing_routes')):
                    raise ValueError('Plus source child/routes changed')
            common.finite_rectangle(b['rect'])
            projected.append({k:b[k] for k in keys})
        views[view]=projected
    projection=dict(document='plus',source_sha256=PLUS_SOURCE,helper_sha256=dict(HELPERS),basic_anchor=document.get('basic_anchor'),
        basic_varname=document.get('basic_varname'),**views,saved_edges=document.get('saved_edges'),observer_leaves=document.get('observer_leaves'))
    payload=_source_canonical(projection)
    if hashlib.sha256(payload).hexdigest()!=PLUS_V8_PROJECTION_SHA256:raise ValueError('Complete pristine plus source projection changed')
    for b in document['boxes']:
        entries=[x for x in document['full_inventory'] if x['anchor']==b['anchor']]
        if len(entries)!=1:raise ValueError('Plus source correspondence changed')
        entry=entries[0]
        for k in PLUS_BOX_KEYS & PLUS_FULL_KEYS:
            if _source_canonical(b[k])!=_source_canonical(entry[k]):raise ValueError('Plus source view correspondence changed')
        if b['anchor'] in PLUS_CONTROLLER_COHORT_PINS:
            if 'initial_numeric' in entry and (not finite(entry['initial_numeric']) or entry['initial_numeric']!=b['initial_numeric']):
                raise ValueError('Plus source default copy changed')
    return projection


def plus_v8_representation_policy(box, numeric=True, live_rect=None):
    pin=(PLUS_V8_NUMERIC_PINS if numeric else PLUS_V8_ROOT_PINS)[box['anchor']]
    policy=dict(kind='plus-v8-'+('numeric' if numeric else 'root')+'-representation-v1',engine='v8',document='plus',
        source_sha256=PLUS_SOURCE,anchor=box['anchor'],source_class='flonum' if numeric else 'newobj',
        runtime_class='number' if numeric else 'jpatcher',**pin,helper_sha256=dict(HELPERS),evidence=dict(PLUS_V8_EVIDENCE))
    if numeric:policy.update(format_method='getattr',format_attribute='format',format_representation='scalar-number',
        format_value_sha256=PLUS_V8_FORMAT_SHA256,getter_method='getvalueof',getter_representation='scalar-number',finite_required=True,initial_equality_action='install')
    else:policy.update(source_runtime_class='patcher',saved_rect=box['rect'],live_rect=live_rect,source_varname=box['source_varname'],saved_incoming_routes=0,saved_outgoing_routes=0)
    return policy


def validate_plus_v8_representation_policy(document, box, policy, numeric=True):
    pin=(PLUS_V8_NUMERIC_PINS if numeric else PLUS_V8_ROOT_PINS).get(box.get('anchor'))
    if (not pin or document.get('document')!='plus' or document.get('source_sha256')!=PLUS_SOURCE or document.get('helper_sha256')!=HELPERS or
        type(policy) is not dict or box.get('maxclass')!=('flonum' if numeric else 'newobj') or
        box.get('runtime_class')!=('flonum' if numeric else 'patcher') or box.get('runtime_classes')!=(['flonum'] if numeric else ['patcher','p']) or
        box.get('source_box_sha256')!=pin['source_box_sha256'] or box.get('source_text_sha256')!=pin['source_text_sha256'] or
        geometry_vector_digest(box.get('rect'))!=pin['saved_rect_sha256']):raise ValueError('Plus V8 exact source binding changed')
    if numeric:
        if not finite(box.get('initial_numeric')) or geometry_vector_digest([box['initial_numeric'],0,0,0])!=pin['initial_numeric_sha256']:
            raise ValueError('Plus V8 initial source scalar changed')
    elif (box.get('source_varname')!=('basic_tab' if box['anchor']=='root/obj-2' else 'q_tab') or
        any(type(box.get(k)) is not int or box[k]!=0 for k in ('saved_incoming_routes','saved_outgoing_routes')) or
        geometry_vector_digest(policy.get('live_rect'))!=pin['live_rect_sha256']):raise ValueError('Plus V8 root source/geometry changed')
    _same(policy,plus_v8_representation_policy(box,numeric,policy.get('live_rect')),'Plus V8 policy')
    return policy


def validate_plus_v8_metadata(document):
    plus=document.get('document')=='plus';fields=('v8_numeric_representation_policy','v8_root_representation_policy')
    present=[b for view in ('boxes','full_inventory','observer_leaves') for b in document.get(view,[]) if any(k in b for k in fields)]
    if not present:return False
    if not plus:
        if any(type(b[k]) is dict and str(b[k].get('kind','')).startswith('plus-') for b in present for k in fields if k in b):
            raise ValueError('Transferred plus V8 policy')
        return False
    plus_v8_source_projection(document)
    if not validate_plus_controller_cohort_metadata(document):raise ValueError('Complete plus controller cohort required')
    for view in ('boxes','full_inventory'):
        expected_geometry=set(PLUS_GEOMETRY_PINS)&{b['anchor'] for b in document[view]}
        if {b['anchor'] for b in document[view] if 'observed_geometry_policy'in b}!=expected_geometry:raise ValueError('Complete plus geometry metadata required')
        for field,pins in ((fields[0],PLUS_V8_NUMERIC_PINS),(fields[1],PLUS_V8_ROOT_PINS if view=='full_inventory' else {})):
            entries=[b for b in document[view] if field in b]
            if Counter(b['anchor'] for b in entries)!=Counter(pins.keys()):raise ValueError('Complete exact plus V8 policy set required')
            for b in entries:validate_plus_v8_representation_policy(document,b,b[field],field==fields[0])
    for anchor in PLUS_V8_NUMERIC_PINS:
        copies=[next(b for b in document[v] if b['anchor']==anchor) for v in ('boxes','full_inventory')]
        _same(copies[0][fields[0]],copies[1][fields[0]],'Plus V8 policy copies')
    return True


def _plus_scalar_observation(observation, method, value=None, digest_pin=None):
    if type(observation) is not dict:raise ValueError('Plus scalar observation unavailable')
    actual=observation.get('value')
    wanted=dict(method=method,status='returned',representation='scalar-number',value=actual)
    if method=='getattr':wanted['attribute']='format'
    if not finite(actual) or (value is not None and actual!=value) or (digest_pin and geometry_vector_digest([actual,0,0,0])!=digest_pin):
        raise ValueError('Plus scalar capability/default changed')
    _same(observation,wanted,'Plus scalar observation')
    return actual


def validate_plus_v8_representation_witnesses(document, raw, request_id, step_id, action):
    if not validate_plus_v8_metadata(document):
        if raw.get('v8_representation_witnesses') is not None:raise ValueError('Unadmitted plus V8 witness')
        return {}
    revision=document.get('revision');operation=raw.get('operation_request_id');witness=raw.get('v8_representation_witnesses')
    event=re.fullmatch(r'plus-A([0-9]{2})',step_id) if type(step_id)is str else None
    valid=(action=='install' and step_id=='install-plus-r'+str(revision) or action=='close' and step_id=='close-plus-r'+str(revision) or
        action=='event' and event and (1<=int(event[1])<=20 if revision==1 else 21<=int(event[1])<=22))
    if (type(revision)is not int or revision not in (1,2) or type(request_id)is not int or request_id<1 or type(operation)is not int or operation<1 or not valid or
        type(document.get('lifecycle_owner_inlet'))is not int or document['lifecycle_owner_inlet']!=revision+1 or type(witness)is not dict or
        (action=='close' and operation!=request_id)):
        raise ValueError('Plus V8 current operation owner changed')
    identity=dict(request_id=request_id,operation_request_id=operation,step_id=step_id,action=action,action_document='plus',action_revision=revision,
        document='plus',revision=revision,source_sha256=PLUS_SOURCE)
    for key,value in identity.items():
        if type(raw.get(key))is not type(value) or raw[key]!=value:raise ValueError('Plus V8 raw request identity changed')
    coverage=lambda count:dict(complete=True,status='complete',observed_count=count,complete_count=count,limit=count)
    wanted=dict(version='plus-v8-representation-witnesses-v1',engine='v8',**identity,helper_sha256=dict(HELPERS),
        working_path=document['working_windows_path'],root_is_top_level=True,receipt_tag_observed=False,evidence=dict(PLUS_V8_EVIDENCE),
        inventory_coverage=dict(root=coverage(8),numeric=coverage(35)),numeric=witness.get('numeric'),roots=witness.get('roots'))
    _same(witness,wanted,'Plus V8 witness request/source/evidence')
    result={}
    for field,pins,numeric in (('numeric',PLUS_V8_NUMERIC_PINS,True),('roots',PLUS_V8_ROOT_PINS,False)):
        rows=witness[field]
        if type(rows)is not list or any(type(r)is not dict for r in rows) or Counter(r.get('anchor')for r in rows)!=Counter(pins.keys()):
            raise ValueError('Plus V8 exact five witness rows required')
        for row in rows:
            b=next(b for b in document['boxes' if numeric else 'full_inventory'] if b['anchor']==row['anchor'])
            wanted=dict(anchor=b['anchor'],source_box_sha256=b['source_box_sha256'],source_text_sha256=b['source_text_sha256'],
                source_class='flonum' if numeric else 'newobj',actual_runtime_class='number' if numeric else 'jpatcher',
                live_rect=row.get('live_rect'),candidate_count=1,candidate_count_complete=True)
            rect=b['rect'] if numeric else b['v8_root_representation_policy']['live_rect']
            if geometry_vector_digest(row.get('live_rect'))!=geometry_vector_digest(rect):raise ValueError('Plus V8 witness geometry changed')
            if numeric:
                _plus_scalar_observation(row.get('format_observation'),'getattr',digest_pin=PLUS_V8_FORMAT_SHA256)
                _plus_scalar_observation(row.get('value_observation'),'getvalueof',b['initial_numeric'] if action=='install' else None)
                wanted.update(geometry_matches=True,receipt_tag_observed=False,format_observation=row['format_observation'],value_observation=row['value_observation'])
            else:wanted['varname']=b['source_varname']
            _same(row,wanted,'Plus V8 exact live witness')
            result[b['anchor']]=row
    return result


def _read_plus_v8_public(name):
    paths=dict(manifest=ROOT/'preparation-manifest-arithmetic007.json',
        audit=REPO/'.superpowers/sdd/2026-10-22-arithmetic-root-runtime/capture-007-audit.md',
        investigation=REPO/'.superpowers/sdd/2026-10-22-arithmetic-root-runtime/capture-007-v8-investigation.md')
    path=paths[name]
    if path.is_symlink() or not path.is_file():raise ValueError('Capture007 regular public provenance required')
    return path.read_bytes()


def _plus007_trace(payload, definition):
    """Check every chronological row, fresh controller pass and final bind."""
    lines=payload.splitlines()
    if not payload.endswith(b'\n') or not payload.isascii() or len(lines)!=268 or max(map(len,lines))>2048:
        raise ValueError('Capture007 complete bounded trace required')
    rows=[parse_json(line) for line in lines];position=0;origin=None;previous=None
    base={'seq','request_id','step_id','action','document','revision','source_sha256','owner_inlet','attempt','phase','clock','at_ms','elapsed_ms'}
    identity=dict(request_id=51,step_id='install-plus-r1',action='install',document='plus',revision=1,source_sha256=PLUS_SOURCE,owner_inlet=2,clock='wall-ms')
    def take(phase, attempt, **extra):
        nonlocal position,origin,previous
        if position>=len(rows):raise ValueError('Capture007 trace truncated')
        row=rows[position];position+=1;_schema(row,base|set(extra),'Capture007 trace row')
        for key in ('seq','request_id','revision','owner_inlet','attempt','at_ms','elapsed_ms'):
            if type(row[key])is not int:raise ValueError('Capture007 trace integer changed')
        expected=dict(identity,seq=position,phase=phase,attempt=attempt,at_ms=row['at_ms'],elapsed_ms=row['elapsed_ms'],**extra)
        _same(row,expected,'Capture007 trace chronology')
        if origin is None:origin=row['at_ms']
        if row['at_ms']<0 or row['elapsed_ms']<0 or row['at_ms']-origin!=row['elapsed_ms'] or (previous is not None and row['at_ms']<previous):
            raise ValueError('Capture007 trace clock changed')
        previous=row['at_ms'];return row
    take('command-consumed',0,working_path=definition['working_windows_path'])
    for phase in ('openfile-enter','openfile-return','poll-scheduled'):take(phase,0)
    boxes={b['anchor']:b for b in definition['boxes']};inventory={b['anchor']:b for b in definition['full_inventory']}
    geometry=list(PLUS_GEOMETRY_PINS);specs=[('geometry',a,4)for a in geometry[:3]]+[('anchor',a,2)for a in PLUS_V8_NUMERIC_PINS]+[('geometry',geometry[3],4)]
    def candidate_key(c):return c.get('maxclass'),geometry_vector_digest(c.get('rect'))
    candidates=Counter(candidate_key(dict(maxclass='number' if b['maxclass']=='flonum' else b['runtime_class'],rect=b.get('observed_geometry_policy',{}).get('live_rect',b['rect'])))for b in boxes.values())
    for attempt in range(1,11):
        take('poll-enter',attempt);take('root-decision',attempt,root_present=True,path_match=True);take('validate-enter',attempt)
        if attempt==1:
            for observation_id,(kind,anchor,parts) in enumerate(specs,1):
                chunks=[]
                for part in range(parts):
                    if position>=len(rows) or type(rows[position].get('data'))is not str or not rows[position]['data']:raise ValueError('Capture007 observation chunk unavailable')
                    chunks.append(take('observation-chunk',attempt,observation_kind=kind,observation_id=observation_id,part=part,parts=parts,data=rows[position]['data'])['data'])
                observation=parse_json(''.join(chunks))
                if kind=='geometry':
                    expected=dict(document='plus',revision=1,source_sha256=PLUS_SOURCE,anchor=anchor,policy=inventory[anchor]['observed_geometry_policy'])
                    if _source_canonical(observation)!=_source_canonical(expected):raise ValueError('Capture007 geometry observation changed')
                else:
                    b=boxes[anchor]
                    _schema(observation,('expected_anchor','expected_maxclass','expected_runtime_class','expected_rect','candidates'),'Capture007 source mismatch')
                    expected=dict(expected_anchor=anchor,expected_maxclass='flonum',expected_runtime_class='flonum',expected_rect=b['rect'],candidates=observation['candidates'])
                    if _source_canonical(observation)!=_source_canonical(expected) or type(observation['candidates'])is not list:raise ValueError('Capture007 original mismatch changed')
                    for c in observation['candidates']:_schema(c,('maxclass','rect'),'Capture007 candidate')
                    if Counter(map(candidate_key,observation['candidates']))!=candidates:raise ValueError('Capture007 full candidate inventory changed')
        take('plus-eligibility',attempt,ready=True,candidates=3,diagnostics=3)
        for anchor in PLUS_V8_NUMERIC_PINS:
            for method in ('getattr','getvalueof'):
                take('capability-enter',attempt,anchor=anchor,method=method);take('capability-call-return',attempt,anchor=anchor,method=method)
                if position>=len(rows):raise ValueError('Capture007 capability trace unavailable')
                observation=take('capability-exit',attempt,anchor=anchor,method=method,observation=rows[position].get('observation'))['observation']
                _plus007_controller_observation(observation,method,boxes[anchor]['initial_numeric'])
        take('validate-return',attempt)
        if attempt<10:take('poll-scheduled',attempt)
    for phase in ('bind-enter','bind-return','install-ready-for-ack'):take(phase,10)
    if position!=len(rows):raise ValueError('Capture007 trailing trace rows')


def _plus007_controller_observation(observation, method, default):
    if type(observation)is not dict:raise ValueError('Capture007 controller capability unavailable')
    value=observation.get('value')
    wanted=dict(method=method,status='returned',representation='scalar-number' if method=='getattr' else 'singleton-number-array',value=value)
    if method=='getattr':wanted['attribute']='format'
    if not finite(value) or (method=='getvalueof' and value!=default) or (method=='getattr' and geometry_vector_digest([value,0,0,0])!=PLUS_V8_FORMAT_SHA256):
        raise ValueError('Capture007 controller capability/default changed')
    _same(observation,wanted,'Capture007 controller capability shape')


def load_plus_v8_representation_measurements():
    """Independently validate immutable007 provenance and failed diagnostics."""
    work=Path.home()/'.cache/alive-ultra-evidence/arithmetic-max-runtime-007'
    history=work.parent/'arithmetic-package-007-historical';evidence=PLUS_V8_EVIDENCE
    names=dict(config='config.json',seal='seal.json',command='command.json',install_ack='observations/ack-request-51.json',
        readback_ack='observations/ack-request-52.json',raw='observations/request-52-plus-r1.json',trace='install-plus-r1-trace.jsonl',
        controller='controller.js',reader='v8-readback.js')
    payloads={key:read_private(work,work/name)for key,name in names.items()}
    for key,payload in payloads.items():
        if hashlib.sha256(payload).hexdigest()!=evidence[key+'_sha256']:raise ValueError('Immutable capture007 artifact changed')
    if len(payloads['raw'])!=PLUS_V8_RAW_BYTES or read_private(work,work/'observations/retained-request-52-plus-r1.json')!=payloads['raw']:
        raise ValueError('Capture007 retained raw bytes changed')
    public={key:_read_plus_v8_public(key)for key in ('manifest','audit','investigation')}
    if any(hashlib.sha256(payload).hexdigest()!=evidence[key+'_sha256']for key,payload in public.items()):raise ValueError('Capture007 public provenance changed')
    archived=read_private(history,history/'binding.json')
    if hashlib.sha256(archived).hexdigest()!=evidence['historical_binding_sha256']:raise ValueError('Capture007 archive binding changed')
    binding=parse_json(archived)
    _schema(binding,('schema_version','role','files','package_files','package_sha256','score_sha256','canonical_sixteen_file_map_sha256',
        'contract_sha256','design_sha256','fix1_brief_sha256','fix1_diff_sha256','fix1_js_report_sha256','fix1_python_report_sha256',
        'fix1_rereview_sha256','fix1_review_map_sha256','initial007_archive_binding_sha256'),'Capture007 archive')
    history_names=set(PACKAGE_FILES)|{'compare.py','native_score.py','run-runtime.py','test_comparison.py','test_native_score.py','test_runner.py'}
    files=binding['files']
    if (type(binding['schema_version'])is not int or binding['schema_version']!=1 or binding['role']!='final007-historical-not-yet-executed' or
        type(files)is not dict or set(files)!=history_names or len(files)!=16 or
        hashlib.sha256(canonical(files)).hexdigest()!=evidence['historical_files_sha256'] or binding['canonical_sixteen_file_map_sha256']!=evidence['historical_files_sha256'] or
        binding['score_sha256']!=SCORE_SHA256):raise ValueError('Capture007 historical inventory/score changed')
    for name,sha in files.items():
        if hashlib.sha256(read_private(history,history/name)).hexdigest()!=sha:raise ValueError('Capture007 consumed archive bytes changed')
    package_files={name:files[name]for name in PACKAGE_FILES};package=dict(package_files=package_files,package_sha256=evidence['package_sha256'])
    if binding['package_sha256']!=evidence['package_sha256'] or binding['package_files']!=package_files or hashlib.sha256(canonical(package_files)).hexdigest()!=evidence['package_sha256']:
        raise ValueError('Capture007 historical package digest changed')
    config,seal,command,ack,dispatch,raw=(parse_json(payloads[k])for k in ('config','seal','command','install_ack','readback_ack','raw'))
    _schema(config,('schema_version','policy','work','documents','preparation_manifest','helpers','source_metadata','package_sha256','dependency_sha256',
        'score_binding','readback_method','global_name','journal_path','observer_path','readback_helper_path','command_path','ack_path','ready_path','lifecycle'),'Capture007 config')
    _schema(seal,('files','score_binding','package_binding','dependency_sha256'),'Capture007 seal')
    if (type(config['schema_version'])is not int or config['schema_version']!=1 or config['policy']!='max-help-arithmetic-three-v1' or config['work']!=str(work) or
        config['readback_method']!='v8-numeric-getvalueof' or config['preparation_manifest']!='preparation-manifest-arithmetic007.json' or
        type(config['global_name'])is not str or not re.fullmatch(r'alive_arithmetic_[0-9a-f]{24}',config['global_name']) or
        config['package_sha256']!=package_files or seal['package_binding']!=package):raise ValueError('Capture007 config/package identity changed')
    score=dict(path='experiments/max-reference/arithmetic-roots-runtime-20261022/score.json',sha256=SCORE_SHA256,bytes=24179,operations=78)
    _same(config['score_binding'],score,'Capture007 full score');_same(seal['score_binding'],score,'Capture007 sealed score')
    _same(config['dependency_sha256'],seal['dependency_sha256'],'Capture007 dependency binding')
    for key,name in (('journal_path','private-journal.jsonl'),('observer_path','observer.js'),('readback_helper_path','v8-readback.js'),('command_path','command.json'),('ack_path','ack.json'),('ready_path','ready.json')):
        if config[key]!=windows_path(work/name):raise ValueError('Capture007 generated private path changed')
    helpers=config['helpers']
    if type(helpers)is not list or len(helpers)!=4:raise ValueError('Capture007 exact helpers required')
    for helper,(name,sha) in zip(helpers,HELPERS.items()):
        _schema(helper,('name','path','sha256','bytes'),'Capture007 helper')
        data=read_private(work,work/'helpers'/name)
        _same(helper,dict(name=name,path='help/resources/'+name,sha256=sha,bytes=len(data)),'Capture007 helper identity')
        if hashlib.sha256(data).hexdigest()!=sha:raise ValueError('Capture007 helper bytes changed')
    sealed={'config.json','controller.js','driver.maxpat','lifecycle-observer.js','observer.js','v8-readback.js'}|{'helpers/'+n for n in HELPERS}
    sealed|={area+'/'+doc+'-r'+str(rev)+'.maxhelp'for area in ('pristine','working')for doc in ('times','plus','minus')for rev in (1,2)}
    if type(seal['files'])is not dict or set(seal['files'])!=sealed or len(sealed)!=22:raise ValueError('Capture007 twenty-two sealed inputs required')
    sealed_payloads={name:read_private(work,work/name)for name in sealed}
    for name,data in sealed_payloads.items():
        if hashlib.sha256(data).hexdigest()!=seal['files'][name]:raise ValueError('Capture007 sealed bytes changed')
    for name in ('controller.js','observer.js','v8-readback.js','lifecycle-observer.js'):
        if seal['files'][name]!=files[name]:raise ValueError('Capture007 sealed/archive script correspondence changed')
    manifest=parse_json(public['manifest'])
    _schema(manifest,('schema_version','status','manifest_name','runtime_invocations','private_work','private_config_sha256','private_seal_sha256',
        'score_binding','package_binding','dependency_sha256','source_metadata','helpers','operation_count','event_count','live_checkpoint_count',
        'empty_checkpoint_count','numeric_state_count','expected_original_outlet_count','final_live_owners'),'Capture007 manifest')
    wanted=dict(schema_version=1,status='PREPARED_NOT_EXECUTED',manifest_name=config['preparation_manifest'],runtime_invocations=0,private_work=str(work),
        private_config_sha256=evidence['config_sha256'],private_seal_sha256=evidence['seal_sha256'],score_binding=score,package_binding=package,
        dependency_sha256=config['dependency_sha256'],source_metadata=config['source_metadata'],helpers=helpers,operation_count=78,event_count=66,
        live_checkpoint_count=72,empty_checkpoint_count=6,numeric_state_count=504,expected_original_outlet_count=141,final_live_owners={})
    _same(manifest,wanted,'Capture007 manifest correspondence')
    lifecycle=config['lifecycle'];_schema(lifecycle,('version','monitor_epoch','owners','driver_inventory','observer_path','report_path'),'Capture007 lifecycle')
    epoch=lifecycle['monitor_epoch']
    if (lifecycle['version']!='arithmetic-freebang-v1' or type(epoch)is not str or not re.fullmatch('[0-9a-f]{48}',epoch) or
        lifecycle['observer_path']!=windows_path(work/'lifecycle-observer.js') or lifecycle['report_path']!=windows_path(work/'lifecycle-report.json') or
        type(lifecycle['owners'])is not list or len(lifecycle['owners'])!=6 or type(config['documents'])is not list or len(config['documents'])!=6):
        raise ValueError('Capture007 complete lifecycle owner map required')
    for inlet,(doc,revision) in enumerate((d,r)for d in ('times','plus','minus')for r in (1,2)):
        owner=lifecycle['owners'][inlet];definition=config['documents'][inlet]
        expected_owner=dict(inlet=inlet,document=doc,revision=revision,source_sha256=IDENTITIES[doc],working_path=windows_path(work/'working'/f'{doc}-r{revision}.maxhelp'),
            channel='__alive_arithmetic_lifecycle_'+epoch+'_'+str(inlet),root_proof_path=windows_path(work/'observations'/f'lifecycle-root-{doc}-r{revision}.json'))
        _same(owner,expected_owner,'Capture007 independent lifecycle owner')
        _schema(definition,('document','source_sha256','source_path','basic_varname','basic_anchor','boxes','saved_edges','full_inventory','helper_sha256',
            'observer_leaves','revision','pristine_path','working_path','working_windows_path','lifecycle_owner_inlet'),'Capture007 document')
        for key,value in dict(document=doc,revision=revision,source_sha256=IDENTITIES[doc],helper_sha256=dict(HELPERS),lifecycle_owner_inlet=inlet,
                basic_varname='basic_tab',basic_anchor=BASIC[doc],pristine_path=str(work/'pristine'/f'{doc}-r{revision}.maxhelp'),
                source_path=str(common.RESOURCES/'help/max'/(doc+'.maxhelp')),
                working_path=str(work/'working'/f'{doc}-r{revision}.maxhelp'),working_windows_path=expected_owner['working_path']).items():
            _same(definition.get(key),value,'Capture007 source owner/path')
        for area in ('pristine','working'):
            if hashlib.sha256(sealed_payloads[f'{area}/{doc}-r{revision}.maxhelp']).hexdigest()!=IDENTITIES[doc]:raise ValueError('Capture007 source revision bytes changed')
        if doc=='plus':
            boxes,inventory,edges=source_inventory('plus',parse_json(sealed_payloads[f'pristine/{doc}-r{revision}.maxhelp'])['patcher'],helpers)
            pristine=dict(document='plus',source_sha256=PLUS_SOURCE,helper_sha256=dict(HELPERS),basic_anchor=BASIC['plus'],basic_varname='basic_tab',boxes=boxes,full_inventory=inventory,saved_edges=edges)
            pristine['observer_leaves']=observer_definitions(pristine);plus_v8_source_projection(pristine)
            for view,entries in (('boxes',boxes),('full_inventory',inventory)):
                saved=definition[view]
                if type(saved)is not list:raise ValueError('Capture007 saved source view unavailable')
                for entry in entries:
                    matches=[b for b in saved if b.get('anchor')==entry['anchor']]
                    if len(matches)!=1:raise ValueError('Capture007 saved source descriptor not unique')
                    if entry['anchor']in PLUS_GEOMETRY_PINS:
                        policy=matches[0].get('observed_geometry_policy');entry.update(observed_geometry_policy=policy,saved_incoming_routes=0,saved_outgoing_routes=0)
                        validate_geometry_policy(definition,entry,policy)
                    if entry['anchor']in PLUS_CONTROLLER_COHORT_PINS:
                        if view=='full_inventory':entry['initial_numeric']=next(b['initial_numeric']for b in boxes if b['anchor']==entry['anchor'])
                        entry['plus_controller_numeric_cohort_policy']=validate_plus_controller_cohort_policy(definition,entry,plus_controller_cohort_policy(entry))
                _same(saved,entries,'Capture007 pure legacy source reconstruction')
            _same(definition['saved_edges'],edges,'Capture007 saved edges');_same(definition['observer_leaves'],observer_definitions(definition),'Capture007 source leaves')
            validate_plus_controller_cohort_metadata(definition)
    argument=windows_path(work/'config.json')
    driver_inventory=[dict(varname='__alive_arithmetic_controller',maxclass='js',boxtext='js controller.js '+argument,rect=[20,20,350,50]),
        dict(varname='__alive_arithmetic_lifecycle_observer',maxclass='v8',boxtext='v8 lifecycle-observer.js '+argument,rect=[-2000,-2000,300,50])]
    driver_inventory.extend(dict(varname='__alive_arithmetic_lifecycle_receive_'+str(o['inlet']),maxclass='receive',boxtext='receive '+o['channel'],
        rect=[-2000,-2100-30*o['inlet'],300,50])for o in lifecycle['owners'])
    _same(lifecycle['driver_inventory'],driver_inventory,'Capture007 driver owner inventory')
    expected_driver=dict(patcher=dict(fileversion=1,rect=[0,0,400,160],locked=1,
        boxes=[dict(box=dict(id=e['varname'],varname=e['varname'],maxclass='newobj',text=e['boxtext'],patching_rect=e['rect']))for e in driver_inventory],
        lines=[dict(patchline=dict(source=['__alive_arithmetic_lifecycle_receive_'+str(o['inlet']),0],
            destination=['__alive_arithmetic_lifecycle_observer',o['inlet']+1]))for o in lifecycle['owners']]))
    _same(parse_json(sealed_payloads['driver.maxpat']),expected_driver,'Capture007 source-bound driver')
    definition=config['documents'][2]
    _same(command,dict(command_id=52,op='readback',action='install',action_document='plus',action_revision=1,document='plus',revision=1,source_sha256=PLUS_SOURCE,
        step_id='install-plus-r1',operation_request_id=51,output_path=windows_path(work/'observations/request-52-plus-r1.json')),'Capture007 command52')
    _same(dispatch,dict(command_id=52,step_id='install-plus-r1',success=True),'Capture007 dispatch ACK52')
    _schema(ack,('command_id','step_id','success','working_path','geometry_dispositions','numeric_mode_observations','controller_representation_observations'),'Capture007 install ACK51')
    expected_geometry=[dict(document='plus',source_sha256=PLUS_SOURCE,revision=1,anchor=a,policy=next(b['observed_geometry_policy']for b in definition['full_inventory']if b['anchor']==a))for a in PLUS_GEOMETRY_PINS]
    if type(ack['geometry_dispositions'])is not list or len(ack['geometry_dispositions'])!=4:raise ValueError('Capture007 four geometry dispositions required')
    for row,expected in zip(ack['geometry_dispositions'],expected_geometry):
        _schema(row,('document','source_sha256','revision','anchor','policy'),'Capture007 geometry disposition')
        policy=copy.deepcopy(expected['policy'])
        if type(row['policy'])is not dict:raise ValueError('Capture007 geometry policy unavailable')
        for key in ('saved_rect','live_rect'):
            if geometry_vector_digest(row['policy'].get(key))!=geometry_vector_digest(policy[key]):raise ValueError('Capture007 geometry disposition vector changed')
            policy[key]=row['policy'][key]
        expected['policy']=policy
    observations=ack['controller_representation_observations']
    if type(observations)is not list or Counter(o.get('anchor')for o in observations)!=Counter(PLUS_V8_NUMERIC_PINS.keys()):raise ValueError('Capture007 satisfied controller cohort changed')
    for observation in observations:
        b=next(b for b in definition['boxes']if b['anchor']==observation['anchor'])
        expected=dict(anchor=b['anchor'],document='plus',revision=1,source_sha256=PLUS_SOURCE,source_box_sha256=b['source_box_sha256'],request_id=51,
            step_id='install-plus-r1',operation_action='install',source_class='flonum',runtime_class='number',receipt_tag_observed=False,engine='js-controller',cohort_satisfied=True,
            policy=b['plus_controller_numeric_cohort_policy'],format_observation=observation.get('format_observation'),value_observation=observation.get('value_observation'))
        _same(observation,expected,'Capture007 controller cohort observation')
        for method,key in (('getattr','format_observation'),('getvalueof','value_observation')):_plus007_controller_observation(observation[key],method,b['initial_numeric'])
    _same(ack,dict(command_id=51,step_id='install-plus-r1',success=True,working_path=definition['working_windows_path'],geometry_dispositions=expected_geometry,
        numeric_mode_observations=[],controller_representation_observations=observations),'Capture007 install ACK51')
    _plus007_trace(payloads['trace'],definition)
    _schema(raw,('success','error_code','request_id','numeric_mode_observation','v8_representation_diagnostics'),'Capture007 failed raw envelope')
    diagnostic=raw['v8_representation_diagnostics']
    if type(diagnostic)is not dict:raise ValueError('Capture007 diagnostic unavailable')
    coverage=lambda n:dict(complete=True,status='complete',observed_count=n,complete_count=n,limit=n)
    expected=dict(engine='v8',request_id=52,operation_request_id=51,step_id='install-plus-r1',action='install',action_document='plus',action_revision=1,
        document='plus',revision=1,source_sha256=PLUS_SOURCE,helper_sha256=dict(HELPERS),receipt_tag_observed=False,inventory_complete=True,
        inventory_coverage=dict(root=coverage(8),numeric=coverage(35)),strict_mismatch=True,numeric_rows=diagnostic.get('numeric_rows'),root_rows=diagnostic.get('root_rows'))
    _same(diagnostic,expected,'Capture007 complete failed diagnostic')
    _same(raw,dict(success=False,error_code='numeric-readback-refused',request_id=52,numeric_mode_observation=None,v8_representation_diagnostics=diagnostic),'Capture007 honest failed envelope')
    result=dict(numeric={},roots={})
    for field,pins in (('numeric_rows',PLUS_V8_NUMERIC_PINS),('root_rows',PLUS_V8_SOURCE_ROOT_PINS)):
        rows=diagnostic[field]
        if type(rows)is not list or any(type(row)is not dict for row in rows) or Counter(row.get('anchor')for row in rows)!=Counter(pins.keys()):raise ValueError('Capture007 exact diagnostic rows changed')
        for row in rows:
            anchor=row['anchor'];numeric=field=='numeric_rows';b=next(b for b in definition['boxes'if numeric else 'full_inventory']if b['anchor']==anchor);pin=pins[anchor]
            expected=dict(anchor=anchor,source_box_sha256=pin['source_box_sha256'],source_text_sha256=pin['source_text_sha256'],source_class='flonum'if numeric else b['maxclass'],
                expected_runtime_classes=['flonum']if numeric else pin['runtime_classes'],candidate_count=1,observed_candidate_count=1,candidate_count_complete=True,
                actual_runtime_class='number'if numeric else 'jpatcher'if anchor in PLUS_V8_ROOT_PINS else pin['runtime_class'],live_rect=row.get('live_rect'))
            if geometry_vector_digest(row.get('live_rect'))!=pin['saved_rect_sha256'if numeric else 'live_rect_sha256']:raise ValueError('Capture007 measured geometry changed')
            if numeric:
                _plus_scalar_observation(row.get('format_observation'),'getattr',digest_pin=PLUS_V8_FORMAT_SHA256)
                value=_plus_scalar_observation(row.get('value_observation'),'getvalueof',b['initial_numeric'],pin['initial_numeric_sha256'])
                expected.update(geometry_matches=True,probe_disposition='observed',receipt_tag_observed=False,format_observation=row['format_observation'],value_observation=row['value_observation'])
                result['numeric'][anchor]=value
            else:
                for k in ('source_box_sha256','source_text_sha256','runtime_class','runtime_classes','maxclass'):
                    if b.get(k)!=pin[k]:raise ValueError('Capture007 independent root source/class changed')
                if geometry_vector_digest(b['rect'])!=pin['saved_rect_sha256']:raise ValueError('Capture007 root saved geometry changed')
                candidates=row.get('candidates');expected_candidates=[]
                anchors=('root/obj-1','root/obj-4')if anchor in ('root/obj-1','root/obj-4')else (anchor,)
                for candidate_anchor in anchors:
                    candidate_pin=PLUS_V8_SOURCE_ROOT_PINS[candidate_anchor]
                    candidate_row=next(r for r in rows if r['anchor']==candidate_anchor)
                    expected_candidates.append(dict(runtime_class='jpatcher'if candidate_anchor in PLUS_V8_ROOT_PINS else candidate_pin['runtime_class'],rect=candidate_row['live_rect'],geometry_matches=candidate_anchor==anchor))
                if type(candidates)is not list or Counter(_source_canonical(c)for c in candidates)!=Counter(_source_canonical(c)for c in expected_candidates):raise ValueError('Capture007 complete raw root candidates changed')
                expected['candidates']=candidates
                if anchor in PLUS_V8_ROOT_PINS:result['roots'][anchor]=row['live_rect']
            _same(row,expected,'Capture007 exact source/probe diagnostic')
    return result


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False).encode('utf-8')


def parse_json(payload):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result: raise ValueError('Duplicate JSON field')
            result[key] = value
        return result
    def constant(_): raise ValueError('Nonfinite JSON constant')
    return json.loads(payload, object_pairs_hook=pairs, parse_constant=constant)


def finite(value):
    return type(value) in (int, float) and math.isfinite(value)


def validate_message(message):
    if type(message) is not dict or set(message) != {'selector', 'atoms'}:
        raise ValueError('Finite typed message shape required')
    selector, atoms = message['selector'], message['atoms']
    if selector not in {'bang', 'int', 'float'} or type(atoms) is not list:
        raise ValueError('Finite typed scalar required')
    if selector == 'bang':
        if atoms: raise ValueError('Bang has no atoms')
    elif (len(atoms) != 1 or type(atoms[0]) is not dict or set(atoms[0]) != {'tag', 'value'} or
          atoms[0]['tag'] != selector or not finite(atoms[0]['value']) or
          (selector == 'int' and type(atoms[0]['value']) is not int)):
        raise ValueError('Typed scalar payload mismatch')
    return message


def expected_score():
    actions = [('obj-22', 'bang', None), ('obj-10', 'bang', None), ('obj-16', 'int', -3),
        ('obj-17', 'int', 7), ('obj-22', 'bang', None), ('obj-16', 'float', .25),
        ('obj-22', 'bang', None), ('obj-16', 'int', 7), ('obj-17', 'float', -3.75),
        ('obj-25', 'int', -3), ('obj-22', 'bang', None), ('obj-24', 'float', .25),
        ('obj-1', 'float', 7), ('obj-10', 'bang', None), ('obj-7', 'int', -3),
        ('obj-24', 'float', -3), ('obj-10', 'bang', None), ('obj-1', 'float', .25),
        ('obj-23', 'float', 7), ('obj-10', 'bang', None), ('obj-22', 'bang', None), ('obj-10', 'bang', None)]
    result = []
    for document, source in IDENTITIES.items():
        base = dict(document=document, source_sha256=source)
        for revision, numbers in ((1, range(1, 21)), (2, range(21, 23))):
            result.append(dict(base, step_id=f'install-{document}-r{revision}', action='install', revision=revision))
            for number in numbers:
                anchor, selector, value = actions[number - 1]
                message = dict(selector=selector, atoms=[] if selector == 'bang' else [dict(tag=selector, value=value)])
                result.append(dict(base, step_id=f'{document}-A{number:02}', action='event',
                    anchor=BASIC[document] + '/' + anchor, inlet=0, message=message))
            result.append(dict(base, step_id=f'close-{document}-r{revision}', action='close'))
    return result


def timeline(score):
    if type(score) is not list or canonical(score) != canonical(expected_score()):
        raise ValueError('Exact finite arithmetic score required')
    live, revisions, result = {}, {}, []
    for row in score:
        document, action = row['document'], row['action']
        if action == 'install': live[document] = revisions[document] = row['revision']
        elif action == 'close': del live[document]
        else: validate_message(row['message'])
        result.append(dict(row, live_owners=dict(live), action_revision=revisions[document]))
    return result


def load_score():
    common.require_digest(SCORE, SCORE_SHA256)
    score = parse_json(SCORE.read_bytes())
    timeline(score)
    return score


def score_binding():
    return dict(path=str(SCORE.relative_to(REPO)), sha256=SCORE_SHA256, bytes=SCORE.stat().st_size,
        operations=len(load_score()))


def package_binding():
    files = {name: digest(ROOT / name) for name in PACKAGE_FILES}
    return dict(package_sha256=hashlib.sha256(canonical(files)).hexdigest(), package_files=files)


def dependency_binding():
    return {str((PREVIOUS / name).relative_to(REPO)): digest(PREVIOUS / name)
        for name in ('help_runtime.py', 'run-runtime.py')}


def _directory(path):
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o700:
        raise ValueError('Private directory mode required')


def private_path(work, value):
    work = Path(work).absolute()
    path = Path(str(value)[2:] if str(value).startswith('Z:/') else value).absolute()
    if work.resolve() != work or path.resolve() != path or '..' in path.parts:
        raise ValueError('Private path symlink or traversal refused')
    try: relative = path.relative_to(work)
    except ValueError: raise ValueError('Private path outside evidence') from None
    if not relative.parts: raise ValueError('Private file path required')
    parent = work; _directory(parent)
    for component in relative.parts[:-1]:
        parent /= component; _directory(parent)
    return path


def read_private(work, value):
    path = private_path(work, value)
    try:
        descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
        with os.fdopen(descriptor, 'rb') as handle:
            before = os.fstat(handle.fileno())
            if not stat.S_ISREG(before.st_mode) or stat.S_IMODE(before.st_mode) != 0o600 or before.st_nlink != 1:
                raise ValueError('Private regular unlinked file mode required')
            data = handle.read(); after = os.fstat(handle.fileno())
        current = path.lstat()
    except OSError: raise ValueError('Private read unavailable') from None
    identity = lambda info: (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns)
    if identity(before) != identity(after) or identity(after) != identity(current) or len(data) != after.st_size:
        raise ValueError('Private file changed during read')
    return data


def retain_raw(path, payload):
    path = Path(path)
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, 'wb') as handle:
        os.fchmod(handle.fileno(), 0o600); handle.write(payload); handle.flush(); os.fsync(handle.fileno())
    return dict(raw_sha256=hashlib.sha256(payload).hexdigest(), raw_bytes=len(payload))


def write_json(path, value):
    return retain_raw(path, canonical(value) + b'\n')


def runtime_classes(maxclass, text):
    if maxclass != 'newobj': return [maxclass]
    tokens = text.split()
    if not tokens: raise ValueError('Missing newobj identity')
    token = tokens[0]; canonical_class = {'p': 'patcher'}.get(token, token)
    return [canonical_class] if canonical_class == token else [canonical_class, token]


def initial_numeric(box):
    if box['maxclass'] not in NUMERIC: return None
    value = box.get('value', 0)
    if type(value) is list and len(value) == 1: value = value[0]
    if not finite(value) or (box['maxclass'] == 'number' and value != math.trunc(value)):
        raise ValueError('Finite source UI value required')
    return value


def geometry_vector_digest(value):
    rectangle = common.finite_rectangle(value)
    # Max JSON serializes whole-valued coordinates without Python's optional .0.
    return hashlib.sha256(canonical([int(v) if v == math.trunc(v) else v for v in rectangle])).hexdigest()


def validate_geometry_policy(document, box, policy):
    plus = document.get('document') == 'plus'
    name, source, pins, evidence = ('plus', PLUS_SOURCE, PLUS_GEOMETRY_PINS, PLUS_EVIDENCE) if plus else ('times', GEOMETRY_SOURCE, TIMES_GEOMETRY_PINS, GEOMETRY_EVIDENCE)
    pin = pins.get(box.get('anchor'))
    if (not pin or document.get('document') != name or document.get('source_sha256') != source or
        document.get('helper_sha256') != HELPERS or type(policy) is not dict):
        raise ValueError('Unobserved arithmetic geometry source or anchor')
    expected = dict(kind=name + '-observed-geometry-v1', document=name, source_sha256=source,
        anchor=box['anchor'], runtime_class=pin['runtime_class'], changed_dimension=pin['changed_dimension'],
        source_box_sha256=pin['source_box_sha256'], source_text_sha256=pin['source_text_sha256'],
        saved_rect=box['rect'], live_rect=policy.get('live_rect'), saved_rect_sha256=pin['saved_rect_sha256'],
        live_rect_sha256=pin['live_rect_sha256'], helper_sha256=dict(HELPERS), evidence=dict(evidence),
        saved_incoming_routes=0, saved_outgoing_routes=0)
    saved = common.finite_rectangle(box['rect']); live = common.finite_rectangle(policy.get('live_rect'))
    if (canonical(expected) != canonical(policy) or box.get('runtime_class') != pin['runtime_class'] or
        (plus and box.get('maxclass') != ('jsui' if pin['runtime_class'] == 'jsui' else 'newobj')) or
        box.get('source_box_sha256') != pin['source_box_sha256'] or box.get('source_text_sha256') != pin['source_text_sha256'] or
        box.get('saved_incoming_routes') != 0 or box.get('saved_outgoing_routes') != 0 or
        geometry_vector_digest(saved) != pin['saved_rect_sha256'] or
        geometry_vector_digest(live) != pin['live_rect_sha256'] or
        [index for index, pair in enumerate(zip(saved, live)) if pair[0] != pair[1]] != [pin['changed_dimension']]):
        raise ValueError('Measured arithmetic geometry binding changed')
    return policy


def load_geometry_measurements():
    """Read immutable capture001 privately; only approved exact vectors enter a new seal."""
    work = Path.home() / '.cache/alive-ultra-evidence/arithmetic-max-runtime-001'
    payloads = {name: read_private(work, work / name) for name in ('config.json', 'seal.json', 'observations/ack-request-1.json')}
    for name, key in (('config.json', 'config_sha256'), ('seal.json', 'seal_sha256'), ('observations/ack-request-1.json', 'ack_sha256')):
        if hashlib.sha256(payloads[name]).hexdigest() != GEOMETRY_EVIDENCE[key]:
            raise ValueError('Immutable capture001 geometry evidence changed')
    manifest = ROOT / 'preparation-manifest-arithmetic001.json'
    if manifest.is_symlink() or digest(manifest) != GEOMETRY_EVIDENCE['manifest_sha256']:
        raise ValueError('Historical capture001 manifest changed')
    config = parse_json(payloads['config.json']); seal = parse_json(payloads['seal.json']); ack = parse_json(payloads['observations/ack-request-1.json'])
    if (config.get('work') != str(work) or {h['name']: h['sha256'] for h in config['helpers']} != HELPERS or
        ack.get('command_id') != 1 or ack.get('success') is not False):
        raise ValueError('Capture001 geometry owner or helper binding changed')
    for name, sha in seal['files'].items():
        if hashlib.sha256(read_private(work, work / name)).hexdigest() != sha:
            raise ValueError('Historical capture001 sealed file changed')
    definitions = [d for d in config['documents'] if d.get('document') == 'times' and d.get('revision') == 1]
    if len(definitions) != 1 or definitions[0].get('source_sha256') != GEOMETRY_SOURCE:
        raise ValueError('Capture001 times source binding unavailable')
    original = read_private(work, definitions[0]['pristine_path'])
    if hashlib.sha256(original).hexdigest() != GEOMETRY_SOURCE: raise ValueError('Capture001 pristine source changed')
    result = {}
    for anchor, pin in TIMES_GEOMETRY_PINS.items():
        diagnostics = [row for row in ack.get('anchor_diagnostics', []) if row.get('expected_anchor') == anchor]
        if len(diagnostics) != 1: raise ValueError('Capture001 geometry diagnostic inventory changed')
        row = diagnostics[0]; saved = common.finite_rectangle(row['expected_rect'])
        candidates = [candidate for candidate in row['candidates'] if candidate.get('rect', [])[:2] == saved[:2]]
        if len(candidates) != 1 or candidates[0].get('maxclass') != pin['runtime_class']:
            raise ValueError('Capture001 geometry candidate not unique')
        live = common.finite_rectangle(candidates[0]['rect'])
        if (geometry_vector_digest(saved) != pin['saved_rect_sha256'] or
            geometry_vector_digest(live) != pin['live_rect_sha256']):
            raise ValueError('Capture001 exact geometry vector changed')
        result[anchor] = live
    return result


def load_plus_measurements():
    """Read immutable004 privately; class-only numeric evidence grants no admission."""
    work = Path.home() / '.cache/alive-ultra-evidence/arithmetic-max-runtime-004'
    names = {'config': 'config.json', 'seal': 'seal.json', 'command': 'command.json', 'ack': 'observations/ack-request-51.json'}
    payloads = {key: read_private(work, work / name) for key, name in names.items()}
    for key, payload in payloads.items():
        if hashlib.sha256(payload).hexdigest() != PLUS_EVIDENCE[key + '_sha256']:
            raise ValueError('Immutable capture004 plus evidence changed')
    manifest = ROOT / 'preparation-manifest-arithmetic004.json'
    audit = REPO / '.superpowers/sdd/2026-10-22-arithmetic-root-runtime/capture-004-audit.md'
    if (manifest.is_symlink() or audit.is_symlink() or digest(manifest) != PLUS_EVIDENCE['manifest_sha256'] or
        digest(audit) != PLUS_EVIDENCE['audit_sha256']):
        raise ValueError('Historical capture004 manifest or audit changed')
    config, seal, command, ack = (parse_json(payloads[key]) for key in ('config', 'seal', 'command', 'ack'))
    binding = seal.get('package_binding', {})
    if (config.get('work') != str(work) or len(config.get('helpers', [])) != 4 or
        {h['name']: h['sha256'] for h in config['helpers']} != HELPERS or
        binding.get('package_sha256') != PLUS_EVIDENCE['package_sha256'] or
        config.get('package_sha256') != binding.get('package_files') or
        parse_json(manifest.read_bytes()).get('package_binding') != binding):
        raise ValueError('Capture004 plus helper or package binding changed')
    for name, sha in seal['files'].items():
        if hashlib.sha256(read_private(work, work / name)).hexdigest() != sha:
            raise ValueError('Historical capture004 sealed bytes changed')
    definitions = [d for d in config['documents'] if d.get('document') == 'plus' and d.get('revision') == 1]
    if len(definitions) != 1 or definitions[0].get('source_sha256') != PLUS_SOURCE:
        raise ValueError('Capture004 exact plus revision1 source required')
    definition = definitions[0]
    wanted_command = dict(command_id=51, op='operation', action='install', action_revision=1,
        document='plus', revision=1, source_sha256=PLUS_SOURCE, step_id='install-plus-r1')
    if (canonical(command) != canonical(wanted_command) or ack.get('command_id') != 51 or ack.get('success') is not False or
        any(ack.get(key) != [] for key in ('geometry_dispositions', 'numeric_mode_observations', 'controller_representation_observations')) or
        definition.get('helper_sha256') != HELPERS or definition.get('lifecycle_owner_inlet') != 2):
        raise ValueError('Capture004 plus install identity or observation changed')
    source = read_private(work, definition['pristine_path'])
    if hashlib.sha256(source).hexdigest() != PLUS_SOURCE: raise ValueError('Capture004 plus pristine source changed')
    boxes, inventory, edges = source_inventory('plus', parse_json(source)['patcher'], config['helpers'])
    if (canonical(boxes) != canonical(definition['boxes']) or canonical(inventory) != canonical(definition['full_inventory']) or
        canonical(edges) != canonical(definition['saved_edges'])):
        raise ValueError('Capture004 plus saved inventory changed')
    diagnostics = ack.get('anchor_diagnostics', [])
    if Counter(r.get('expected_anchor') for r in diagnostics) != Counter(list(PLUS_GEOMETRY_PINS) + list(PLUS_NUMERIC_PINS)):
        raise ValueError('Capture004 exact seven plus diagnostics required')
    result = {}
    for row in diagnostics:
        anchor = row['expected_anchor']; originals = [b for b in inventory if b['anchor'] == anchor]
        if len(originals) != 1: raise ValueError('Capture004 plus source anchor not unique')
        b = originals[0]; geo = anchor in PLUS_GEOMETRY_PINS
        pin = (PLUS_GEOMETRY_PINS if geo else PLUS_NUMERIC_PINS)[anchor]
        saved = common.finite_rectangle(row['expected_rect'])
        candidates = [c for c in row['candidates'] if c.get('rect', [])[:2] == saved[:2]]
        if (set(row) != {'expected_anchor', 'expected_rect', 'expected_maxclass', 'expected_runtime_class', 'candidates'} or
            row['expected_maxclass'] != b['maxclass'] or row['expected_runtime_class'] != b['runtime_class'] or
            saved != b['rect'] or len(candidates) != 1 or
            candidates[0].get('maxclass') != (pin['runtime_class'] if geo else 'number') or
            b.get('source_box_sha256') != pin['source_box_sha256'] or b.get('source_text_sha256') != pin['source_text_sha256'] or
            geometry_vector_digest(saved) != pin['saved_rect_sha256']):
            raise ValueError('Capture004 plus exact source or candidate binding changed')
        live = common.finite_rectangle(candidates[0]['rect'])
        if geo:
            policy = dict(kind='plus-observed-geometry-v1', document='plus', source_sha256=PLUS_SOURCE,
                anchor=anchor, **pin, saved_rect=b['rect'], live_rect=live, helper_sha256=dict(HELPERS),
                evidence=dict(PLUS_EVIDENCE), saved_incoming_routes=0, saved_outgoing_routes=0)
            validate_geometry_policy(definition, b, policy); result[anchor] = live
        elif b['maxclass'] != 'flonum' or b['runtime_class'] != 'flonum' or live != saved:
            raise ValueError('Capture004 plus numeric class-only evidence changed')
    return result


def plus_controller_cohort_policy(box):
    return dict(kind='plus-controller-numeric-cohort-v1', engine='js-controller', document='plus',
        source_sha256=PLUS_SOURCE, anchor=box['anchor'], source_class='flonum', runtime_class='number',
        cohort_anchors=list(PLUS_CONTROLLER_COHORT_PINS), cohort_binding_sha256=PLUS_CONTROLLER_COHORT_BINDING,
        **PLUS_CONTROLLER_COHORT_PINS[box['anchor']], helper_sha256=dict(HELPERS),
        evidence=dict(PLUS_CONTROLLER_COHORT_EVIDENCE), format_method='getattr', format_attribute='format',
        format_representation='scalar-number', format_value_sha256=PLUS_CONTROLLER_COHORT_FORMAT_SHA256,
        getter_method='getvalueof', getter_representation='singleton-number-array', finite_required=True,
        source_initial_equality=True, fresh_complete_cohort_required=True)


def validate_plus_controller_cohort_policy(document, box, policy):
    pin = PLUS_CONTROLLER_COHORT_PINS.get(box.get('anchor'))
    if (not pin or document.get('document') != 'plus' or document.get('source_sha256') != PLUS_SOURCE or
        document.get('helper_sha256') != HELPERS or
        ('revision' in document and (type(document['revision']) is not int or document['revision'] not in (1, 2))) or
        box.get('maxclass') != 'flonum' or box.get('runtime_class') != 'flonum' or box.get('runtime_classes') != ['flonum'] or
        box.get('source_box_sha256') != pin['source_box_sha256'] or box.get('source_text_sha256') != pin['source_text_sha256'] or
        not finite(box.get('initial_numeric')) or type(policy) is not dict):
        raise ValueError('Unobserved plus controller cohort binding')
    if (geometry_vector_digest(box.get('rect')) != pin['saved_rect_sha256'] or
        geometry_vector_digest([box['initial_numeric'], 0, 0, 0]) != pin['initial_numeric_sha256'] or
        canonical(policy) != canonical(plus_controller_cohort_policy(box))):
        raise ValueError('Plus controller cohort policy changed')
    return policy


def validate_plus_controller_cohort_metadata(document):
    field = 'plus_controller_numeric_cohort_policy'
    views = [[box for box in document.get(view, []) if field in box] for view in ('boxes', 'full_inventory')]
    if not any(views): return False
    for boxes in views:
        if Counter(box.get('anchor') for box in boxes) != Counter(PLUS_CONTROLLER_COHORT_PINS.keys()):
            raise ValueError('Complete plus controller cohort metadata required')
        for box in boxes: validate_plus_controller_cohort_policy(document, box, box[field])
    for anchor in PLUS_CONTROLLER_COHORT_PINS:
        copies = [next(box for box in view if box['anchor'] == anchor) for view in views]
        if canonical(copies[0][field]) != canonical(copies[1][field]):
            raise ValueError('Plus controller cohort descriptor copies changed')
        for view in ('boxes', 'full_inventory'):
            if sum(box.get('anchor') == anchor for box in document[view]) != 1:
                raise ValueError('Unique plus controller cohort descriptors required')
    return True


def _plus_controller_trace(payload, definition):
    """Validate the complete retained prefix; no terminal success is present."""
    if (not payload.endswith(b'\n') or not payload.isascii() or len(payload.splitlines()) != 1490 or
        max(map(len, payload.splitlines())) > 955):
        raise ValueError('Capture006 complete ASCII trace prefix required')
    rows = [parse_json(line) for line in payload.splitlines()]
    base_keys = {'seq', 'request_id', 'step_id', 'action', 'document', 'revision', 'source_sha256',
        'owner_inlet', 'attempt', 'phase', 'clock', 'at_ms', 'elapsed_ms'}
    identity = dict(request_id=51, step_id='install-plus-r1', action='install', document='plus', revision=1,
        source_sha256=PLUS_SOURCE, owner_inlet=2, clock='wall-ms')
    position, previous, origin = 0, None, None

    def take(phase, attempt, extra=None):
        nonlocal position, previous, origin
        if position >= len(rows): raise ValueError('Capture006 trace truncated')
        row = rows[position]; position += 1; extra = extra or {}
        if (type(row) is not dict or set(row) != base_keys | set(extra) or
            any(type(row.get(key)) is not int for key in ('seq', 'request_id', 'revision', 'owner_inlet', 'attempt', 'at_ms', 'elapsed_ms')) or
            row['seq'] != position or row['attempt'] != attempt or row['phase'] != phase or
            any(type(row.get(key)) is not type(value) or row[key] != value for key, value in identity.items()) or
            any(type(row.get(key)) is not type(value) or row[key] != value for key, value in extra.items())):
            raise ValueError('Capture006 trace schema, sequence or identity changed')
        if origin is None: origin = row['at_ms']
        if (row['at_ms'] < 0 or row['elapsed_ms'] < 0 or row['at_ms'] - origin != row['elapsed_ms'] or
            (previous is not None and row['at_ms'] < previous)):
            raise ValueError('Capture006 trace wall-clock relationship changed')
        previous = row['at_ms']
        return row

    take('command-consumed', 0, dict(working_path=definition['working_windows_path']))
    for phase in ('openfile-enter', 'openfile-return', 'poll-scheduled'): take(phase, 0)
    geometry_anchors = list(PLUS_GEOMETRY_PINS)
    chunk_specs = [('geometry', anchor, 4) for anchor in geometry_anchors[:3]]
    chunk_specs += [('anchor', anchor, 2) for anchor in PLUS_CONTROLLER_COHORT_PINS]
    chunk_specs += [('geometry', geometry_anchors[3], 4)]
    source_boxes = {box['anchor']: box for box in definition['boxes']}
    inventory = {box['anchor']: box for box in definition['full_inventory']}
    candidate_key = lambda row: (row['maxclass'], geometry_vector_digest(row['rect']))
    expected_candidates = Counter(candidate_key(dict(maxclass='number' if box['maxclass'] == 'flonum' else box['runtime_class'],
        rect=box.get('observed_geometry_policy', {}).get('live_rect', box['rect']))) for box in source_boxes.values())
    for attempt in range(1, 62):
        take('poll-enter', attempt); take('root-decision', attempt, dict(root_present=True, path_match=True)); take('validate-enter', attempt)
        if attempt == 1:
            for identity_number, (kind, anchor, parts) in enumerate(chunk_specs, 1):
                chunks = []
                for part in range(parts):
                    if (position >= len(rows) or type(rows[position]) is not dict or
                        type(rows[position].get('data')) is not str or not rows[position]['data']):
                        raise ValueError('Capture006 observation chunk unavailable')
                    chunks.append(take('observation-chunk', attempt, dict(observation_kind=kind, observation_id=identity_number,
                        part=part, parts=parts, data=rows[position]['data']))['data'])
                observation = parse_json(''.join(chunks))
                if kind == 'geometry':
                    expected = dict(document='plus', revision=1, source_sha256=PLUS_SOURCE, anchor=anchor,
                        policy=inventory[anchor]['observed_geometry_policy'])
                    if type(observation) is not dict or type(observation.get('policy')) is not dict:
                        raise ValueError('Capture006 geometry chunk schema changed')
                    for key in ('saved_rect', 'live_rect'):
                        if common.finite_rectangle(observation['policy'].get(key)) != common.finite_rectangle(expected['policy'][key]):
                            raise ValueError('Capture006 geometry chunk rectangle changed')
                        observation['policy'][key] = expected['policy'][key]
                    if canonical(observation) != canonical(expected): raise ValueError('Capture006 geometry chunk binding changed')
                    validate_geometry_policy(definition, inventory[anchor], observation['policy'])
                else:
                    box = source_boxes[anchor]
                    if (type(observation) is not dict or set(observation) != {'expected_anchor', 'expected_maxclass', 'expected_runtime_class', 'expected_rect', 'candidates'} or
                        observation['expected_anchor'] != anchor or observation['expected_maxclass'] != 'flonum' or
                        observation['expected_runtime_class'] != 'flonum' or common.finite_rectangle(observation['expected_rect']) != box['rect'] or
                        type(observation['candidates']) is not list or len(observation['candidates']) != 16):
                        raise ValueError('Capture006 numeric diagnostic binding changed')
                    for candidate in observation['candidates']:
                        if type(candidate) is not dict or set(candidate) != {'maxclass', 'rect'} or type(candidate['maxclass']) is not str:
                            raise ValueError('Capture006 numeric candidate schema changed')
                    if Counter(map(candidate_key, observation['candidates'])) != expected_candidates:
                        raise ValueError('Capture006 exact numeric candidate inventory changed')
                    matches = [candidate for candidate in observation['candidates'] if common.finite_rectangle(candidate['rect']) == box['rect']]
                    if len(matches) != 1 or matches[0]['maxclass'] != 'number':
                        raise ValueError('Capture006 unique numeric candidate changed')
        take('plus-eligibility', attempt, dict(ready=True, candidates=3, diagnostics=3))
        for anchor, pin in PLUS_CONTROLLER_COHORT_PINS.items():
            for method in ('getattr', 'getvalueof'):
                bracket = dict(anchor=anchor, method=method)
                take('capability-enter', attempt, bracket); take('capability-call-return', attempt, bracket)
                if position >= len(rows) or type(rows[position]) is not dict or type(rows[position].get('observation')) is not dict:
                    raise ValueError('Capture006 capability observation unavailable')
                observation = take('capability-exit', attempt, dict(bracket, observation=rows[position]['observation']))['observation']
                expected = dict(method=method, status='returned', representation='scalar-number' if method == 'getattr' else 'singleton-number-array',
                    value=observation.get('value'))
                if method == 'getattr': expected['attribute'] = 'format'
                value = observation.get('value')
                if (not finite(value) or canonical(observation) != canonical(expected) or
                    hashlib.sha256(canonical(observation)).hexdigest() != PLUS_CONTROLLER_COHORT_OBSERVATION_SHA256[method] or
                    geometry_vector_digest([value, 0, 0, 0]) != (PLUS_CONTROLLER_COHORT_FORMAT_SHA256 if method == 'getattr' else pin['initial_numeric_sha256']) or
                    (method == 'getvalueof' and value != source_boxes[anchor]['initial_numeric'])):
                    raise ValueError('Capture006 capability shape or source witness changed')
        take('validate-refused', attempt, dict(diagnostics=3, geometry_dispositions=4)); take('poll-scheduled', attempt)
    if position != len(rows): raise ValueError('Capture006 unexpected terminal or trailing trace row')
    return {anchor:source_boxes[anchor]['initial_numeric'] for anchor in PLUS_CONTROLLER_COHORT_PINS}


def load_plus_controller_cohort_measurements():
    """Independently bind immutable006 bytes and source-derived controller witnesses."""
    work = Path.home() / '.cache/alive-ultra-evidence/arithmetic-max-runtime-006'
    history = Path.home() / '.cache/alive-ultra-evidence/arithmetic-package-006-historical'
    evidence = PLUS_CONTROLLER_COHORT_EVIDENCE
    payloads = {key:read_private(work, work / name) for key, name in (
        ('config', 'config.json'), ('seal', 'seal.json'), ('trace', 'install-plus-r1-trace.jsonl'), ('controller', 'controller.js'))}
    for key, payload in payloads.items():
        if hashlib.sha256(payload).hexdigest() != evidence[key + '_sha256']:
            raise ValueError('Immutable capture006 cohort evidence changed')
    public = [('manifest', ROOT / 'preparation-manifest-arithmetic006.json'), ('verification', ROOT / 'verification-capture006.json')]
    public += [(key, REPO / '.superpowers/sdd/2026-10-22-arithmetic-root-runtime' / name) for key, name in (
        ('audit', 'capture-006-audit.md'), ('investigation', 'capture-006-trace-investigation.md'))]
    public_payloads = {}
    for key, path in public:
        if path.is_symlink() or not path.is_file() or digest(path) != evidence[key + '_sha256']:
            raise ValueError('Capture006 immutable public provenance changed')
        public_payloads[key] = path.read_bytes()
    historical_payload = read_private(history, history / 'binding.json')
    if hashlib.sha256(historical_payload).hexdigest() != evidence['historical_binding_sha256']:
        raise ValueError('Capture006 historical binding changed')
    historical = parse_json(historical_payload); historical_files = historical.get('files')
    history_names = set(PACKAGE_FILES) | {'compare.py', 'native_score.py', 'run-runtime.py', 'test_comparison.py', 'test_native_score.py', 'test_runner.py'}
    if (type(historical_files) is not dict or set(historical_files) != history_names or
        hashlib.sha256(canonical(historical_files)).hexdigest() != PLUS_CONTROLLER_COHORT_HISTORY_MAP_SHA256 or
        historical.get('package_sha256') != evidence['package_sha256'] or historical.get('score_sha256') != SCORE_SHA256):
        raise ValueError('Capture006 historical package inventory changed')
    for name, sha in historical_files.items():
        if hashlib.sha256(read_private(history, history / name)).hexdigest() != sha:
            raise ValueError('Capture006 consumed historical package file changed')
    config, seal = (parse_json(payloads[key]) for key in ('config', 'seal'))
    binding = seal.get('package_binding', {}); package_files = {name:historical_files[name] for name in PACKAGE_FILES}
    if (binding != dict(package_files=package_files, package_sha256=evidence['package_sha256']) or
        hashlib.sha256(canonical(package_files)).hexdigest() != evidence['package_sha256'] or
        parse_json(public_payloads['manifest']).get('package_binding') != binding or config.get('package_sha256') != package_files or
        config.get('work') != str(work) or type(config.get('helpers')) is not list or len(config['helpers']) != 4 or
        {helper['name']:helper['sha256'] for helper in config['helpers']} != HELPERS):
        raise ValueError('Capture006 consumed package, helper or owner changed')
    sealed_names = {'config.json', 'controller.js', 'driver.maxpat', 'lifecycle-observer.js', 'observer.js', 'v8-readback.js'}
    sealed_names |= {'helpers/' + name for name in HELPERS}
    sealed_names |= {area + '/' + name + '-r' + str(revision) + '.maxhelp' for area in ('pristine', 'working') for name in ('times', 'plus', 'minus') for revision in (1, 2)}
    if type(seal.get('files')) is not dict or set(seal['files']) != sealed_names or len(sealed_names) != 22:
        raise ValueError('Capture006 exact twenty-two sealed inputs required')
    for name, sha in seal['files'].items():
        if hashlib.sha256(read_private(work, work / name)).hexdigest() != sha:
            raise ValueError('Capture006 sealed input changed')
    for name, sha in HELPERS.items():
        if seal['files']['helpers/' + name] != sha: raise ValueError('Capture006 sealed helper identity changed')
    command_payload = read_private(work, work / 'command.json')
    if hashlib.sha256(command_payload).hexdigest() != PLUS_CONTROLLER_COHORT_COMMAND_SHA256:
        raise ValueError('Capture006 immutable pending command changed')
    command = parse_json(command_payload)
    expected_command = dict(command_id=51, op='operation', action='install', action_revision=1,
        document='plus', revision=1, source_sha256=PLUS_SOURCE, step_id='install-plus-r1')
    if canonical(command) != canonical(expected_command): raise ValueError('Capture006 pending request51 identity changed')
    definitions = [row for row in config.get('documents', []) if row.get('document') == 'plus' and row.get('revision') == 1]
    if len(definitions) != 1: raise ValueError('Capture006 exact plus revision1 source required')
    definition = definitions[0]
    if (type(definition.get('revision')) is not int or definition.get('source_sha256') != PLUS_SOURCE or
        definition.get('helper_sha256') != HELPERS or type(definition.get('lifecycle_owner_inlet')) is not int or
        definition['lifecycle_owner_inlet'] != 2 or definition.get('pristine_path') != str(work / 'pristine/plus-r1.maxhelp') or
        definition.get('working_path') != str(work / 'working/plus-r1.maxhelp') or
        definition.get('working_windows_path') != windows_path(work / 'working/plus-r1.maxhelp')):
        raise ValueError('Capture006 plus source, path or owner binding changed')
    lifecycle = config.get('lifecycle')
    if type(lifecycle) is not dict or type(lifecycle.get('owners')) is not list or len(lifecycle['owners']) != 6:
        raise ValueError('Capture006 lifecycle owner map required')
    owners = lifecycle['owners']
    if any(type(owner) is not dict or type(owner.get('inlet')) is not int or owner['inlet'] != inlet
        for inlet, owner in enumerate(owners)):
        raise ValueError('Capture006 lifecycle owner inlet map changed')
    owner = owners[definition['lifecycle_owner_inlet']]
    expected_owner = dict(inlet=definition['lifecycle_owner_inlet'], document=definition['document'],
        revision=definition['revision'], source_sha256=definition['source_sha256'], working_path=definition['working_windows_path'])
    if any(type(owner.get(key)) is not type(value) or owner[key] != value for key, value in expected_owner.items()):
        raise ValueError('Capture006 plus lifecycle owner binding changed')
    source = read_private(work, definition['pristine_path'])
    if hashlib.sha256(source).hexdigest() != PLUS_SOURCE: raise ValueError('Capture006 pristine plus source changed')
    boxes, inventory, edges = source_inventory('plus', parse_json(source)['patcher'], config['helpers'])
    for view, original in (('boxes', boxes), ('full_inventory', inventory)):
        for box in original:
            if box['anchor'] not in PLUS_GEOMETRY_PINS: continue
            matches = [entry for entry in definition[view] if entry['anchor'] == box['anchor']]
            if len(matches) != 1: raise ValueError('Capture006 geometry descriptor not unique')
            policy = matches[0].get('observed_geometry_policy')
            box.update(observed_geometry_policy=policy, saved_incoming_routes=0, saved_outgoing_routes=0)
            validate_geometry_policy(definition, box, policy)
        if canonical(original) != canonical(definition[view]): raise ValueError('Capture006 source-derived inventory changed')
    if canonical(edges) != canonical(definition['saved_edges']): raise ValueError('Capture006 saved source edges changed')
    cohort = [dict(anchor=anchor, source_box_sha256=pin['source_box_sha256'], source_text_sha256=pin['source_text_sha256'])
        for anchor, pin in PLUS_CONTROLLER_COHORT_PINS.items()]
    if hashlib.sha256(canonical(cohort)).hexdigest() != PLUS_CONTROLLER_COHORT_BINDING:
        raise ValueError('Capture006 ordered source cohort binding changed')
    for anchor in PLUS_CONTROLLER_COHORT_PINS:
        matches = [box for box in boxes if box['anchor'] == anchor]
        if len(matches) != 1: raise ValueError('Capture006 source numeric anchor not unique')
        validate_plus_controller_cohort_policy(definition, matches[0], plus_controller_cohort_policy(matches[0]))
    return _plus_controller_trace(payloads['trace'], definition)


def controller_representation_policy(box):
    pin = NUMERIC_REPRESENTATION_PINS[box['anchor']]
    return dict(kind='times-controller-numeric-representation-v1', engine='js-controller', document='times',
        source_sha256=GEOMETRY_SOURCE, anchor=box['anchor'], source_class='flonum', runtime_class='number',
        **pin, helper_sha256=dict(HELPERS), evidence=dict(NUMERIC_REPRESENTATION_EVIDENCE),
        format_method='getattr', format_attribute='format', format_representation='scalar-number', format_value=6,
        getter_method='getvalueof', getter_representation='singleton-number-array',
        finite_required=True, source_initial_equality=True)


def validate_controller_representation_policy(document, box, policy):
    pin = NUMERIC_REPRESENTATION_PINS.get(box.get('anchor'))
    if (not pin or document.get('document') != 'times' or document.get('source_sha256') != GEOMETRY_SOURCE or
        document.get('helper_sha256') != HELPERS or
        ('revision' in document and (type(document['revision']) is not int or document['revision'] not in (1, 2))) or
        box.get('maxclass') != 'flonum' or box.get('runtime_class') != 'flonum' or
        box.get('runtime_classes') != ['flonum'] or
        box.get('source_box_sha256') != pin['source_box_sha256'] or
        box.get('source_text_sha256') != pin['source_text_sha256'] or not finite(box.get('initial_numeric'))):
        raise ValueError('Unobserved controller numeric representation binding')
    # Reuse the finite-vector hash with a fixed domain for the private initial scalar.
    if (geometry_vector_digest(box.get('rect')) != pin['saved_rect_sha256'] or
        geometry_vector_digest([box['initial_numeric'], 0, 0, 0]) != pin['initial_numeric_sha256'] or
        canonical(policy) != canonical(controller_representation_policy(box))):
        raise ValueError('Controller numeric representation policy changed')
    return policy


def load_numeric_representation_measurements():
    """Verify immutable002 privately; numeric observations are controller-only."""
    work = Path.home() / '.cache/alive-ultra-evidence/arithmetic-max-runtime-002'
    payloads = {name: read_private(work, work / name) for name in ('config.json', 'seal.json', 'observations/ack-request-1.json')}
    for name, key in (('config.json', 'config_sha256'), ('seal.json', 'seal_sha256'), ('observations/ack-request-1.json', 'ack_sha256')):
        if hashlib.sha256(payloads[name]).hexdigest() != NUMERIC_REPRESENTATION_EVIDENCE[key]:
            raise ValueError('Immutable capture002 numeric evidence changed')
    manifest = ROOT / 'preparation-manifest-arithmetic002.json'
    if manifest.is_symlink() or digest(manifest) != NUMERIC_REPRESENTATION_EVIDENCE['manifest_sha256']:
        raise ValueError('Historical capture002 manifest changed')
    config = parse_json(payloads['config.json']); seal = parse_json(payloads['seal.json'])
    ack = parse_json(payloads['observations/ack-request-1.json'])
    if (config.get('work') != str(work) or len(config.get('helpers', [])) != 4 or
        {h['name']: h['sha256'] for h in config['helpers']} != HELPERS or
        ack.get('command_id') != 1 or ack.get('success') is not False):
        raise ValueError('Capture002 owner or helper binding changed')
    for name, sha in seal['files'].items():
        if hashlib.sha256(read_private(work, work / name)).hexdigest() != sha:
            raise ValueError('Historical capture002 sealed file changed')
    definitions = [d for d in config['documents'] if d.get('document') == 'times' and d.get('revision') == 1]
    if len(definitions) != 1 or definitions[0].get('source_sha256') != GEOMETRY_SOURCE:
        raise ValueError('Capture002 exact times owner required')
    definition = definitions[0]
    if hashlib.sha256(read_private(work, definition['pristine_path'])).hexdigest() != GEOMETRY_SOURCE:
        raise ValueError('Capture002 pristine source changed')
    diagnostics = [r for r in ack.get('anchor_diagnostics', []) if 'numeric_preflight_observation' in r]
    if Counter(r['numeric_preflight_observation'].get('anchor') for r in diagnostics) != Counter(NUMERIC_REPRESENTATION_PINS.keys()):
        raise ValueError('Capture002 numeric diagnostic inventory changed')
    result = {}
    for diagnostic in diagnostics:
        row = diagnostic['numeric_preflight_observation']; anchor = row['anchor']
        boxes = [b for b in definition['boxes'] if b['anchor'] == anchor]
        if len(boxes) != 1: raise ValueError('Capture002 numeric source anchor not unique')
        box = boxes[0]; validate_controller_representation_policy(definition, box, controller_representation_policy(box))
        wanted = dict(anchor=anchor, document='times', revision=1, source_sha256=GEOMETRY_SOURCE,
            source_box_sha256=box['source_box_sha256'], request_id=1, step_id='install-times-r1',
            operation_action='install', source_class='flonum', runtime_class='number', receipt_tag_observed=False,
            format_observation=dict(method='getattr', attribute='format', status='returned', representation='scalar-number', value=6),
            value_observation=dict(method='getvalueof', status='returned', representation='singleton-number-array', value=box['initial_numeric']))
        candidates = [c for c in diagnostic.get('candidates', []) if c.get('rect') == box['rect']]
        if (canonical(row) != canonical(wanted) or diagnostic.get('expected_anchor') != anchor or
            diagnostic.get('expected_rect') != box['rect'] or len(candidates) != 1 or candidates[0].get('maxclass') != 'number'):
            raise ValueError('Capture002 numeric outcome changed')
        result[anchor] = box['initial_numeric']
    return result


def load_v8_representation_measurements():
    """Verify capture003 bytes and seven complete source-bound diagnostic rows privately."""
    work = Path.home() / '.cache/alive-ultra-evidence/arithmetic-max-runtime-003'
    names = {'config.json': 'config_sha256', 'seal.json': 'seal_sha256',
        'observations/ack-request-1.json': 'ack_sha256', 'observations/request-2-times-r1.json': 'raw_sha256'}
    payloads = {name: read_private(work, work / name) for name in names}
    if any(hashlib.sha256(payloads[name]).hexdigest() != V8_REPRESENTATION_EVIDENCE[key] for name, key in names.items()):
        raise ValueError('Immutable capture003 V8 evidence changed')
    manifest = ROOT / 'preparation-manifest-arithmetic003.json'
    audit = REPO / '.superpowers/sdd/2026-10-22-arithmetic-root-runtime/capture-003-audit.md'
    if (manifest.is_symlink() or audit.is_symlink() or digest(manifest) != V8_REPRESENTATION_EVIDENCE['manifest_sha256'] or
        digest(audit) != V8_REPRESENTATION_EVIDENCE['audit_sha256']):
        raise ValueError('Historical capture003 manifest or audit changed')
    config, seal, ack, raw = (parse_json(payloads[name]) for name in names)
    if (config.get('work') != str(work) or len(config.get('helpers', [])) != 4 or
        {h['name']: h['sha256'] for h in config['helpers']} != HELPERS or
        ack.get('success') is not True or ack.get('command_id') != 1 or ack.get('step_id') != 'install-times-r1' or
        raw.get('success') is not False or raw.get('request_id') != 2 or raw.get('error_code') != 'numeric-readback-refused'):
        raise ValueError('Capture003 install/readback identity changed')
    for name, sha in seal['files'].items():
        if hashlib.sha256(read_private(work, work / name)).hexdigest() != sha:
            raise ValueError('Historical capture003 sealed bytes changed')
    definitions = [d for d in config['documents'] if d.get('document') == 'times' and d.get('revision') == 1]
    if len(definitions) != 1: raise ValueError('Capture003 exact times owner unavailable')
    definition = definitions[0]
    if (definition.get('source_sha256') != GEOMETRY_SOURCE or definition.get('helper_sha256') != HELPERS or
        ack.get('working_path') != definition.get('working_windows_path') or
        hashlib.sha256(read_private(work, definition['pristine_path'])).hexdigest() != GEOMETRY_SOURCE):
        raise ValueError('Capture003 source/default owner changed')
    diagnostic = raw.get('v8_representation_diagnostics', {})
    coverage = {scope: dict(complete=True, status='complete', observed_count=count, complete_count=count, limit=count)
        for scope, count in (('root', 8), ('numeric', 35))}
    expected = dict(engine='v8', request_id=2, operation_request_id=1, step_id='install-times-r1', action='install',
        action_document='times', action_revision=1, document='times', revision=1, source_sha256=GEOMETRY_SOURCE,
        helper_sha256=dict(HELPERS), receipt_tag_observed=False, inventory_complete=True, inventory_coverage=coverage,
        strict_mismatch=True, numeric_rows=diagnostic.get('numeric_rows'), root_rows=diagnostic.get('root_rows'))
    if canonical(diagnostic) != canonical(expected): raise ValueError('Capture003 complete diagnostic binding changed')
    numeric_rows, root_rows = diagnostic['numeric_rows'], diagnostic['root_rows']
    if (type(numeric_rows) is not list or type(root_rows) is not list or
        Counter(r.get('anchor') for r in numeric_rows) != Counter(NUMERIC_REPRESENTATION_PINS.keys()) or
        Counter(r.get('anchor') for r in root_rows) != Counter(V8_SOURCE_ROOT_PINS.keys())):
        raise ValueError('Capture003 exact seven diagnostic anchors changed')
    result = dict(numeric={}, roots={})
    for row in numeric_rows:
        boxes = [b for b in definition['boxes'] if b['anchor'] == row['anchor']]
        if len(boxes) != 1: raise ValueError('Capture003 numeric source not unique')
        b = boxes[0]; validate_v8_representation_policy(definition, b, v8_representation_policy(b))
        wanted = dict(anchor=b['anchor'], source_box_sha256=b['source_box_sha256'], source_text_sha256=b['source_text_sha256'],
            source_class='flonum', expected_runtime_classes=['flonum'], candidate_count=1, observed_candidate_count=1,
            candidate_count_complete=True, actual_runtime_class='number', live_rect=b['rect'], geometry_matches=True,
            probe_disposition='observed', receipt_tag_observed=False,
            format_observation=dict(method='getattr', attribute='format', status='returned', representation='scalar-number', value=6),
            value_observation=dict(method='getvalueof', status='returned', representation='scalar-number', value=b['initial_numeric']))
        if common.finite_rectangle(row.get('live_rect')) != common.finite_rectangle(b['rect']):
            raise ValueError('Capture003 exact numeric geometry changed')
        wanted['live_rect'] = row['live_rect']
        if canonical(row) != canonical(wanted): raise ValueError('Capture003 scalar numeric/default observation changed')
        result['numeric'][b['anchor']] = b['initial_numeric']
    for row in root_rows:
        boxes = [b for b in definition['full_inventory'] if b['anchor'] == row['anchor']]
        if len(boxes) != 1: raise ValueError('Capture003 source root not unique')
        b = boxes[0]; pin = V8_SOURCE_ROOT_PINS[b['anchor']]
        live = common.finite_rectangle(row.get('live_rect'))
        if (b.get('source_box_sha256') != pin['source_box_sha256'] or b.get('source_text_sha256') != pin['source_text_sha256'] or
            b.get('runtime_class') != pin['runtime_class'] or b.get('runtime_classes') != pin['runtime_classes'] or
            geometry_vector_digest(b['rect']) != pin['saved_rect_sha256']):
            raise ValueError('Capture003 source root binding changed')
        actual = 'jpatcher' if b['anchor'] in V8_ROOT_REPRESENTATION_PINS else b['runtime_class']
        if b['anchor'] in V8_ROOT_REPRESENTATION_PINS:
            validate_v8_representation_policy(definition, b, v8_representation_policy(b, False, live), False)
            result['roots'][b['anchor']] = live
        else:
            live_hash = TIMES_GEOMETRY_PINS.get(b['anchor'], pin).get('live_rect_sha256', pin['saved_rect_sha256'])
            if geometry_vector_digest(live) != live_hash: raise ValueError('Capture003 root helper geometry changed')
        if (row.get('source_box_sha256') != pin['source_box_sha256'] or row.get('source_text_sha256') != pin['source_text_sha256'] or
            row.get('source_class') != b['maxclass'] or row.get('expected_runtime_classes') != pin['runtime_classes'] or
            type(row.get('candidate_count')) is not int or row['candidate_count'] != 1 or
            type(row.get('observed_candidate_count')) is not int or row['observed_candidate_count'] != 1 or
            row.get('candidate_count_complete') is not True or row.get('actual_runtime_class') != actual or
            type(row.get('candidates')) is not list or
            sum(c.get('runtime_class') == actual and c.get('rect') == live and c.get('geometry_matches') is True
                for c in row['candidates']) != 1):
            raise ValueError('Capture003 unique live root observation changed')
    return result


def v8_representation_policy(box, numeric=True, live_rect=None):
    pin = (NUMERIC_REPRESENTATION_PINS if numeric else V8_ROOT_REPRESENTATION_PINS)[box['anchor']]
    policy = dict(kind='times-v8-' + ('numeric' if numeric else 'root') + '-representation-v1', engine='v8',
        document='times', source_sha256=GEOMETRY_SOURCE, anchor=box['anchor'],
        source_class='flonum' if numeric else 'newobj', runtime_class='number' if numeric else 'jpatcher',
        **pin, helper_sha256=dict(HELPERS), evidence=dict(V8_REPRESENTATION_EVIDENCE))
    if numeric:
        policy.update(format_method='getattr', format_attribute='format', format_representation='scalar-number',
            format_value=6, getter_method='getvalueof', getter_representation='scalar-number',
            finite_required=True, initial_equality_action='install')
    else:
        policy.update(source_runtime_class='patcher', saved_rect=box['rect'], live_rect=live_rect,
            source_varname=box['source_varname'], saved_incoming_routes=0, saved_outgoing_routes=0)
    return policy


def validate_v8_representation_policy(document, box, policy, numeric=True):
    pin = (NUMERIC_REPRESENTATION_PINS if numeric else V8_ROOT_REPRESENTATION_PINS).get(box.get('anchor'))
    if (not pin or document.get('document') != 'times' or document.get('source_sha256') != GEOMETRY_SOURCE or
        document.get('helper_sha256') != HELPERS or type(policy) is not dict or
        ('revision' in document and (type(document['revision']) is not int or document['revision'] not in (1, 2))) or
        box.get('maxclass') != ('flonum' if numeric else 'newobj') or
        box.get('runtime_class') != ('flonum' if numeric else 'patcher') or
        box.get('runtime_classes') != (['flonum'] if numeric else ['patcher', 'p']) or
        box.get('source_box_sha256') != pin['source_box_sha256'] or
        box.get('source_text_sha256') != pin['source_text_sha256'] or
        geometry_vector_digest(box.get('rect')) != pin['saved_rect_sha256']):
        raise ValueError('Unobserved V8 representation source binding')
    if numeric:
        if (not finite(box.get('initial_numeric')) or
            geometry_vector_digest([box['initial_numeric'], 0, 0, 0]) != pin['initial_numeric_sha256']):
            raise ValueError('V8 source-derived initial value changed')
    elif (box.get('source_varname') != ('basic_tab' if box['anchor'] == 'root/obj-4' else 'q_tab') or
        box.get('saved_incoming_routes') != 0 or box.get('saved_outgoing_routes') != 0 or
        geometry_vector_digest(policy.get('live_rect')) != pin['live_rect_sha256']):
        raise ValueError('V8 exact measured root binding changed')
    if canonical(policy) != canonical(v8_representation_policy(box, numeric, policy.get('live_rect'))):
        raise ValueError('V8 representation policy changed')
    return policy


def validate_v8_representation_witnesses(document, raw, request_id, step_id, action):
    if document.get('document') == 'plus':
        return validate_plus_v8_representation_witnesses(document,raw,request_id,step_id,action)
    validate_plus_v8_metadata(document)
    numeric = [b for b in document['boxes'] if 'v8_numeric_representation_policy' in b]
    roots = [b for b in document.get('full_inventory', []) if 'v8_root_representation_policy' in b]
    witness = raw.get('v8_representation_witnesses')
    if not numeric and not roots:
        if witness is not None: raise ValueError('Unadmitted V8 representation witnesses')
        return {}
    if (Counter(b['anchor'] for b in numeric) != Counter(NUMERIC_REPRESENTATION_PINS.keys()) or
        Counter(b['anchor'] for b in roots) != Counter(V8_ROOT_REPRESENTATION_PINS.keys()) or
        len(numeric) != 3 or len(roots) != 2 or type(witness) is not dict):
        raise ValueError('Exact five V8 representation policies and witnesses required')
    for b in numeric: validate_v8_representation_policy(document, b, b['v8_numeric_representation_policy'])
    for b in roots: validate_v8_representation_policy(document, b, b['v8_root_representation_policy'], False)
    revision = document['revision']; operation = raw.get('operation_request_id')
    event = re.fullmatch(r'times-A([0-9]{2})', step_id)
    valid_step = (action == 'install' and step_id == 'install-times-r' + str(revision) or
        action == 'close' and step_id == 'close-times-r' + str(revision) or
        action == 'event' and event and (1 <= int(event[1]) <= 20 if revision == 1 else 21 <= int(event[1]) <= 22))
    if (type(request_id) is not int or request_id < 1 or type(operation) is not int or operation < 1 or not valid_step or
        raw.get('action_document') != 'times' or raw.get('action_revision') != revision or
        type(raw.get('action_revision')) is not int or type(document.get('lifecycle_owner_inlet')) is not int or
        document.get('lifecycle_owner_inlet') != revision - 1):
        raise ValueError('V8 representation operation owner changed')
    def coverage(count):
        return dict(complete=True, status='complete', observed_count=count, complete_count=count, limit=count)
    wanted = dict(version='times-v8-representation-witnesses-v1', engine='v8', request_id=request_id,
        operation_request_id=operation, step_id=step_id, action=action, action_document='times', action_revision=revision,
        document='times', revision=revision, source_sha256=GEOMETRY_SOURCE, helper_sha256=dict(HELPERS),
        working_path=document['working_windows_path'], root_is_top_level=True, receipt_tag_observed=False,
        evidence=dict(V8_REPRESENTATION_EVIDENCE),
        inventory_coverage=dict(root=coverage(8), numeric=coverage(len(document['boxes']) + len(document['observer_leaves']))),
        numeric=witness.get('numeric'), roots=witness.get('roots'))
    if canonical(witness) != canonical(wanted): raise ValueError('V8 witness source/request/evidence binding changed')
    result = {}
    for entries, boxes, numeric_kind in ((witness['numeric'], numeric, True), (witness['roots'], roots, False)):
        expected = {b['anchor']: b for b in boxes}
        if type(entries) is not list or Counter(r.get('anchor') for r in entries) != Counter(expected.keys()):
            raise ValueError('V8 live witness inventory changed')
        for row in entries:
            b = expected[row['anchor']]
            wanted = dict(anchor=b['anchor'], source_box_sha256=b['source_box_sha256'], source_text_sha256=b['source_text_sha256'],
                source_class='flonum' if numeric_kind else 'newobj', actual_runtime_class='number' if numeric_kind else 'jpatcher',
                live_rect=b['rect'] if numeric_kind else b['v8_root_representation_policy']['live_rect'],
                candidate_count=1, candidate_count_complete=True)
            if common.finite_rectangle(row.get('live_rect')) != common.finite_rectangle(wanted['live_rect']):
                raise ValueError('V8 exact live witness geometry changed')
            wanted['live_rect'] = row['live_rect']
            if numeric_kind:
                value = row.get('value_observation', {}).get('value')
                if not finite(value) or (action == 'install' and value != b['initial_numeric']):
                    raise ValueError('V8 numeric live/default witness unavailable')
                wanted.update(geometry_matches=True, receipt_tag_observed=False,
                    format_observation=dict(method='getattr', attribute='format', status='returned', representation='scalar-number', value=6),
                    value_observation=dict(method='getvalueof', status='returned', representation='scalar-number', value=value))
            else: wanted['varname'] = b['source_varname']
            if canonical(row) != canonical(wanted): raise ValueError('V8 exact live witness changed')
            result[b['anchor']] = row
    return result


def validate_retention(document, raw, request_id, step_id, witnesses, geometry_dispositions):
    normalize = lambda value: value.replace('\\', '/').lower() if type(value) is str else None
    if (type(request_id) is not int or request_id < 1 or type(raw.get('request_id')) is not int or
        raw.get('request_id') != request_id or raw.get('success') is not True or raw.get('step_id') != step_id or
        raw.get('document') != document['document'] or raw.get('source_sha256') != document['source_sha256'] or
        raw.get('root_is_top_level') is not True or raw.get('saved_order_observed') is not False or
        normalize(raw.get('working_root_path')) != normalize(document['working_windows_path'])):
        raise ValueError('Arithmetic checkpoint working owner changed')
    if type(raw.get('boxes')) is not list: raise ValueError('Arithmetic box inventory unavailable')
    actual = {}
    for box in raw['boxes']:
        name = box.get('varname')
        if type(name) is not str or not name or name in actual: raise ValueError('Arithmetic box identity not unique')
        actual[name] = box
    originals = {b['id']: b for b in document['boxes']}
    if len(originals) != len(document['boxes']): raise ValueError('Source box identity not unique')
    for b in document['boxes']:
        text = b.get('authored_text')
        if (type(text) is not str or type(b.get('authored_empty')) is not bool or b['authored_empty'] != (not bool(text)) or
            ('source_text_sha256' in b and hashlib.sha256(text.encode()).hexdigest() != b['source_text_sha256']) or
            type(b.get('outlets')) is not int or b['outlets'] < 0 or
            ('inlets' in b and (type(b['inlets']) is not int or b['inlets'] < 0))):
            raise ValueError('Original source text/empty or port inventory changed')
        if 'full_inventory' in document:
            entries = [e for e in document['full_inventory'] if e.get('anchor') == b['anchor']]
            keys = ('maxclass', 'runtime_class', 'runtime_classes', 'source_box_sha256', 'source_text_sha256',
                'inlets', 'outlets', 'authored_text', 'authored_empty')
            if (len(entries) != 1 or common.finite_rectangle(entries[0].get('rect')) != common.finite_rectangle(b['rect']) or
                any(canonical(entries[0].get(k)) != canonical(b.get(k)) for k in keys if k in entries[0] or k in b)):
                raise ValueError('Original source descriptor inventory changed')
        live = actual.get(original_varname(b))
        cls = 'number' if b['anchor'] in witnesses else b['runtime_class']
        if live is None or live.get('maxclass') != cls: raise ValueError('Exact arithmetic runtime class changed')
        rect = common.finite_rectangle(live.get('rect')); saved = common.finite_rectangle(b['rect'])
        policy = b.get('observed_geometry_policy')
        if policy is not None:
            validate_geometry_policy(document, b, policy)
            if rect not in (saved, policy['live_rect']): raise ValueError('Measured annotation runtime geometry changed')
            if geometry_dispositions is not None and rect == policy['live_rect']:
                geometry_dispositions.append(dict(document=document['document'], source_sha256=document['source_sha256'],
                    revision=document['revision'], anchor=b['anchor'], policy=policy))
        elif rect != saved: raise ValueError('Original runtime geometry changed')
    leaves = observer_definitions(document)
    if document.get('observer_leaves') != leaves: raise ValueError('Observer definition changed')
    names = {original_varname(b) for b in originals.values()} | {l['varname'] for l in leaves}
    if set(actual) != names: raise ValueError('Unexpected or missing Basic object')
    for leaf in leaves:
        if actual[leaf['varname']].get('maxclass') != 'js': raise ValueError('Observer leaf class changed')
    expected_routes = Counter()
    for edge in document['saved_edges']:
        s, d = edge['source'], edge['destination']
        if (s[0] not in originals or d[0] not in originals or type(s[1]) is not int or type(d[1]) is not int or
            not 0 <= s[1] < originals[s[0]]['outlets'] or d[1] < 0 or
            ('inlets' in originals[d[0]] and d[1] >= originals[d[0]]['inlets'])):
            raise ValueError('Saved source port inventory changed')
        expected_routes[(original_varname(originals[s[0]]), s[1], original_varname(originals[d[0]]), d[1])] += 1
    for leaf in leaves:
        b = next(b for b in originals.values() if b['anchor'] == leaf['anchor'])
        expected_routes[(original_varname(b), leaf['port'], leaf['varname'], 0)] += 1
    def route_key(route):
        endpoints = []
        for side in ('source', 'destination'):
            e = route.get(side, {})
            if e.get('varname') not in names or type(e.get('port')) is not int or e['port'] < 0:
                raise ValueError('Runtime route endpoint unavailable')
            endpoints.extend((e['varname'], e['port']))
        return tuple(endpoints)
    for key in ('input_routes', 'output_routes'):
        if type(raw.get(key)) is not list or Counter(route_key(r) for r in raw[key]) != expected_routes:
            raise ValueError('Executable endpoint multiset changed')
    if raw.get('messages') != [] or any(b['maxclass'] == 'message' for b in originals.values()):
        raise ValueError('Arithmetic Message capability not admitted')
    return dict(method='runtime-object-and-endpoint-inventory', original_basic_boxes_retained=len(originals),
        original_basic_cables_retained=len(document['saved_edges']), observer_leaf_cables_retained=len(leaves),
        unexpected_basic_cables=0, saved_order_observed=False,
        input_endpoint_multiset_verified=True, output_endpoint_multiset_verified=True)


def source_inventory(document, root, helpers):
    """Inspect a digest-pinned source without emitting authored strings or graph data."""
    if {h['name']: h['sha256'] for h in helpers} != HELPERS or len(helpers) != 4:
        raise ValueError('Exact helper file inventory required')
    inventory, raw_by_anchor = [], {}
    def visit(patcher, scope='root'):
        boxes = patcher.get('boxes'); lines = patcher.get('lines', [])
        if type(boxes) is not list or type(lines) is not list: raise ValueError('Saved tree arrays required')
        ids = set()
        for item in boxes:
            b = item['box']; identity = b['id']; anchor = scope + '/' + identity
            if identity in ids or anchor in raw_by_anchor: raise ValueError('Duplicate original anchor')
            ids.add(identity); raw_by_anchor[anchor] = b
            classes = runtime_classes(b['maxclass'], b.get('text', ''))
            rect = common.finite_rectangle(b['patching_rect'])
            entry = dict(anchor=anchor, maxclass=b['maxclass'], runtime_class=classes[0], runtime_classes=classes,
                rect=rect, child='patcher' in b, source_varname=b.get('varname'),
                inlets=b.get('numinlets', 0), outlets=b.get('numoutlets', 0),
                authored_text=b.get('text', ''), authored_empty=not bool(b.get('text', '')),
                source_text_sha256=hashlib.sha256(b.get('text', '').encode()).hexdigest(),
                source_box_sha256=hashlib.sha256(canonical(b)).hexdigest(),
                saved_incoming_routes=sum(line['patchline']['destination'][0] == identity for line in lines),
                saved_outgoing_routes=sum(line['patchline']['source'][0] == identity for line in lines))
            inventory.append(entry)
            if 'patcher' in b: visit(b['patcher'], anchor)
        for line in lines:
            edge = line['patchline']
            for side in ('source', 'destination'):
                endpoint = edge[side]
                if type(endpoint) is not list or len(endpoint) != 2 or endpoint[0] not in ids or type(endpoint[1]) is not int or endpoint[1] < 0:
                    raise ValueError('Invalid saved cable endpoint')
    visit(root)
    basic_box, question_box = raw_by_anchor.get(BASIC[document]), raw_by_anchor.get(QUESTION[document])
    if (len(root['boxes']) != 4 or root.get('lines', []) or not basic_box or not question_box or
        basic_box.get('varname') != 'basic_tab' or question_box.get('varname') != 'q_tab' or
        'patcher' not in basic_box or 'patcher' not in question_box or
        question_box['patcher'].get('boxes') != [] or question_box['patcher'].get('lines', [])):
        raise ValueError('Exact original root and saved child scopes required')
    basic = basic_box['patcher']
    if len(inventory) != 20 or len(basic['boxes']) != 16 or len(basic.get('lines', [])) != 8:
        raise ValueError('Exact complete 20-box 8-cable source retention required')
    helper_anchors = HELPER_ANCHORS[document]
    for index, (anchor, filename) in enumerate(zip(helper_anchors, HELPERS)):
        b = raw_by_anchor.get(anchor)
        if not b or b.get('numinlets') != 1 or b.get('numoutlets') != 1 or b.get('outlettype') != ['']:
            raise ValueError('Exact helper anchor ports required')
        entry = next(row for row in inventory if row['anchor'] == anchor)
        if entry['saved_incoming_routes'] or entry['saved_outgoing_routes']: raise ValueError('Helper must be disconnected')
        if index == 0:
            text = b.get('text', ''); tokens = text.split()
            attributes = b.get('saved_object_attributes')
            if (b['maxclass'] != 'newobj' or len(tokens) != 3 or tokens[:2] != ['js', filename] or
                attributes != dict(filename=filename, parameter_enable=0) or
                hashlib.sha256(text.encode()).hexdigest() != STARTER_HASHES[document]):
                raise ValueError('Source-bound starter identity required')
            argument = tokens[2]
        else:
            args = b.get('jsarguments')
            if (b['maxclass'] != 'jsui' or b.get('filename') != filename or b.get('border') != 0 or
                b.get('ignoreclick') != 1 or b.get('parameter_enable') != 0 or
                type(args) is not list or len(args) != 1 or type(args[0]) is not str):
                raise ValueError('Source-bound helper role shape required')
            argument = args[0]
        if hashlib.sha256(argument.encode()).hexdigest() != HELPER_ARGUMENT_HASHES[document][1 if index == 3 else 0]:
            raise ValueError('Source-bound helper argument required')
    scripts = {entry['anchor'] for entry in inventory if entry['runtime_class'] in {'js', 'jsui', 'v8'}}
    if scripts != set(helper_anchors): raise ValueError('Unexpected source script')
    boxes = []; by_role = {identity: role for role, (identity, _) in ROLES.items()}
    for item in basic['boxes']:
        b = item['box']; anchor = BASIC[document] + '/' + b['id']; classes = runtime_classes(b['maxclass'], b.get('text', ''))
        boxes.append(dict(id=b['id'], anchor=anchor, maxclass=b['maxclass'], runtime_class=classes[0],
            runtime_classes=classes, rect=common.finite_rectangle(b['patching_rect']),
            inlets=b.get('numinlets', 0), outlets=b.get('numoutlets', 0),
            authored_text=b.get('text', ''), authored_empty=not bool(b.get('text', '')),
            initial_numeric=initial_numeric(b), role=by_role.get(b['id']),
            source_box_sha256=hashlib.sha256(canonical(b)).hexdigest(),
            source_text_sha256=hashlib.sha256(b.get('text', '').encode()).hexdigest()))
    expected_exec = {BASIC[document] + '/' + identity for identity, cls in ROLES.values()}
    actual_exec = {b['anchor'] for b in boxes if b['maxclass'] not in {'comment', 'jsui'}}
    if actual_exec != expected_exec or sum(b['maxclass'] == 'comment' for b in boxes) != 4:
        raise ValueError('Exact ten executable roles required')
    for role, (identity, cls) in ROLES.items():
        b = raw_by_anchor[BASIC[document] + '/' + identity]
        if b['maxclass'] != cls: raise ValueError('Original executable role class mismatch')
        if cls == 'newobj':
            index = 0 if role == 'integer_operator' else 1
            if (b['text'].split()[0] != CLASSES[document] or
                hashlib.sha256(b['text'].encode()).hexdigest() != OPERATOR_HASHES[document][index]):
                raise ValueError('Exact private operator creation identity required')
        if cls in NUMERIC and ('minimum' in b or 'maximum' in b or (cls == 'flonum' and b.get('format') != 6)):
            raise ValueError('Finite source numeric settings mismatch')
    if len({tuple(b['rect']) for b in boxes}) != len(boxes): raise ValueError('Unique source geometry required')
    return boxes, inventory, [dict(index=index, **copy.deepcopy(item['patchline'])) for index, item in enumerate(basic['lines'])]


def source_metadata(resources=common.RESOURCES):
    resources = Path(resources)
    helpers = []
    for name, sha in HELPERS.items():
        path = resources / 'help/resources' / name
        if path.is_symlink() or not path.is_file(): raise ValueError('Regular installed helper required')
        helpers.append(dict(name=name, path='help/resources/' + name, sha256=sha, bytes=path.stat().st_size))
    common.require_helpers(resources, helpers)
    documents, public = [], []
    for document, source in IDENTITIES.items():
        path = resources / 'help/max' / (document + '.maxhelp')
        if path.is_symlink() or not path.is_file() or path.stat().st_size != SOURCE_BYTES[document]:
            raise ValueError('Exact regular installed source required')
        common.require_digest(path, source)
        root = parse_json(path.read_bytes())['patcher']
        boxes, inventory, edges = source_inventory(document, root, helpers)
        common.require_digest(path, source)
        definition = dict(document=document, source_sha256=source, source_path=str(path.resolve()),
            basic_varname='basic_tab', basic_anchor=BASIC[document], boxes=boxes, saved_edges=edges,
            full_inventory=inventory, helper_sha256=dict(HELPERS))
        if (document == 'times' and source == GEOMETRY_SOURCE) or (document == 'plus' and source == PLUS_SOURCE):
            pins = PLUS_GEOMETRY_PINS if document == 'plus' else TIMES_GEOMETRY_PINS
            evidence = PLUS_EVIDENCE if document == 'plus' else GEOMETRY_EVIDENCE
            measured = load_plus_measurements() if document == 'plus' else load_geometry_measurements()
            for entry in inventory:
                pin = pins.get(entry['anchor'])
                if pin is None: continue
                policy = dict(kind=document + '-observed-geometry-v1', document=document, source_sha256=source,
                    anchor=entry['anchor'], runtime_class=pin['runtime_class'], changed_dimension=pin['changed_dimension'],
                    source_box_sha256=pin['source_box_sha256'], source_text_sha256=pin['source_text_sha256'],
                    saved_rect=entry['rect'], live_rect=measured[entry['anchor']], saved_rect_sha256=pin['saved_rect_sha256'],
                    live_rect_sha256=pin['live_rect_sha256'], helper_sha256=dict(HELPERS), evidence=dict(evidence),
                    saved_incoming_routes=0, saved_outgoing_routes=0)
                entry['observed_geometry_policy'] = validate_geometry_policy(definition, entry, policy)
                for box in boxes:
                    if box['anchor'] == entry['anchor']:
                        box.update(observed_geometry_policy=copy.deepcopy(policy), saved_incoming_routes=0, saved_outgoing_routes=0)
        if document == 'times' and source == GEOMETRY_SOURCE:
            observed_numeric = load_numeric_representation_measurements()
            for box in boxes:
                if box['anchor'] not in NUMERIC_REPRESENTATION_PINS: continue
                if box['initial_numeric'] != observed_numeric[box['anchor']]:
                    raise ValueError('Observed controller initial value changed')
                policy = validate_controller_representation_policy(definition, box, controller_representation_policy(box))
                box['controller_numeric_representation_policy'] = policy
                entry = next(entry for entry in inventory if entry['anchor'] == box['anchor'])
                entry.update(initial_numeric=box['initial_numeric'], controller_numeric_representation_policy=copy.deepcopy(policy))
                validate_controller_representation_policy(definition, entry, policy)
            observed_v8 = load_v8_representation_measurements()
            for box in boxes:
                if box['anchor'] not in NUMERIC_REPRESENTATION_PINS: continue
                if box['initial_numeric'] != observed_v8['numeric'][box['anchor']]:
                    raise ValueError('Observed V8 source-derived default changed')
                policy = validate_v8_representation_policy(definition, box, v8_representation_policy(box))
                box['v8_numeric_representation_policy'] = policy
                entry = next(entry for entry in inventory if entry['anchor'] == box['anchor'])
                entry['v8_numeric_representation_policy'] = copy.deepcopy(policy)
                validate_v8_representation_policy(definition, entry, policy)
            for entry in inventory:
                if entry['anchor'] not in V8_ROOT_REPRESENTATION_PINS: continue
                entry['v8_root_representation_policy'] = validate_v8_representation_policy(definition, entry,
                    v8_representation_policy(entry, False, observed_v8['roots'][entry['anchor']]), False)
        if document == 'plus' and source == PLUS_SOURCE:
            observed_cohort = load_plus_controller_cohort_measurements()
            for box in boxes:
                if box['anchor'] not in PLUS_CONTROLLER_COHORT_PINS: continue
                if box['initial_numeric'] != observed_cohort[box['anchor']]:
                    raise ValueError('Observed plus controller source-derived default changed')
                policy = validate_plus_controller_cohort_policy(definition, box, plus_controller_cohort_policy(box))
                box['plus_controller_numeric_cohort_policy'] = policy
                entry = next(entry for entry in inventory if entry['anchor'] == box['anchor'])
                entry.update(initial_numeric=box['initial_numeric'], plus_controller_numeric_cohort_policy=copy.deepcopy(policy))
            validate_plus_controller_cohort_metadata(definition)
            observed_v8 = load_plus_v8_representation_measurements()
            for box in boxes:
                if box['anchor'] not in PLUS_V8_NUMERIC_PINS: continue
                if box['initial_numeric'] != observed_v8['numeric'][box['anchor']]:
                    raise ValueError('Observed plus V8 source default changed')
                box['v8_numeric_representation_policy'] = validate_plus_v8_representation_policy(definition,box,plus_v8_representation_policy(box))
                entry = next(entry for entry in inventory if entry['anchor']==box['anchor'])
                entry['v8_numeric_representation_policy'] = copy.deepcopy(box['v8_numeric_representation_policy'])
            for entry in inventory:
                if entry['anchor'] in PLUS_V8_ROOT_PINS:
                    entry['v8_root_representation_policy'] = validate_plus_v8_representation_policy(definition,entry,
                        plus_v8_representation_policy(entry,False,observed_v8['roots'][entry['anchor']]),False)
        definition['observer_leaves'] = observer_definitions(definition)
        validate_plus_v8_metadata(definition)
        documents.append(definition)
        public.append(dict(document=document, source_sha256=source, bytes=path.stat().st_size,
            full_box_count=20, basic_box_count=16, basic_cable_count=8, executable_count=10,
            numeric_anchor_count=7, observer_leaf_cables=len(definition['observer_leaves']),
            anchors=[dict(anchor=b['anchor'], maxclass=b['maxclass'], role=b['role']) for b in boxes if b['role']]))
    return documents, public, helpers


def validate_checkpoint(document, raw, request_id, step_id, action, geometry_dispositions=None, numeric_mode_observations=None):
    validate_plus_controller_cohort_metadata(document)
    for box in document['boxes']:
        if 'controller_numeric_representation_policy' in box:
            validate_controller_representation_policy(document, box, box['controller_numeric_representation_policy'])
    if any(NO_POLICIES.intersection(box) for box in document['boxes']):
        raise ValueError('Arithmetic geometry or mode exception is not admitted')
    if (type(raw.get('revision')) is not int or raw['revision'] != document['revision'] or
        raw.get('action') != action or raw.get('readback_method') != 'v8-numeric-getvalueof' or
        raw.get('messages') != [] or raw.get('numeric_modes', []) != []):
        raise ValueError('Arithmetic checkpoint identity or unsupported capability mismatch')
    witnesses = validate_v8_representation_witnesses(document, raw, request_id, step_id, action)
    retention = validate_retention(document, raw, request_id, step_id, witnesses, geometry_dispositions)
    expected = {b['anchor']: b for b in document['boxes'] if b['maxclass'] in NUMERIC}
    numeric = raw.get('numeric')
    if len(expected) != 7 or type(numeric) is not list or Counter(v.get('anchor') for v in numeric) != Counter(expected.keys()):
        raise ValueError('Exactly seven numeric original getters required')
    states = []
    for value in numeric:
        source = expected[value['anchor']]; cls = source['maxclass']; number = value.get('value')
        gated = 'v8_numeric_representation_policy' in source
        actual_class = 'number' if gated else cls
        tag, basis = ('float', 'source-flonum-and-live-v8-format6' if gated else 'flonum-class') if cls == 'flonum' else ('int', 'number-class')
        if gated and (value.get('source_class') != 'flonum' or value.get('getter_representation') != 'scalar-number' or
            number != witnesses[value['anchor']]['value_observation']['value'] or
            (document.get('document') == 'plus' and value.get('receipt_tag_observed', False) is not False)):
            raise ValueError('Numeric state differs from fresh V8 witness')
        if (not finite(number) or value.get('class_name') != actual_class or value.get('getter_method') != 'getvalueof' or
            value.get('getter_representation') not in {'scalar-number', 'singleton-number-array'} or
            value.get('semantic_tag') != tag or value.get('semantic_tag_basis') != basis or
            (tag == 'int' and number != math.trunc(number))):
            raise ValueError('Numeric getter unavailable or malformed')
        states.append(dict(anchor=value['anchor'], class_name=actual_class, source_class=cls, value=number, semantic_tag=tag,
            semantic_tag_basis=basis, getter_representation=value['getter_representation'],
            getter_method='getvalueof', receipt_tag_observed=False))
    return dict(request_id=request_id, step_id=step_id, action=action, document=document['document'],
        source_sha256=document['source_sha256'], revision=document['revision'], working_path=document['working_windows_path'],
        readback_method='v8-numeric-getvalueof', numeric_states=states,
        retention=retention, **({'v8_representation_witnesses': copy.deepcopy(raw['v8_representation_witnesses'])} if witnesses else {}))


def validate_live_checkpoints(operation, checkpoints):
    if type(checkpoints) is not list or Counter(row.get('document') for row in checkpoints) != Counter(operation['live_owners'].keys()):
        raise ValueError('Exact explicit all-live checkpoint set required')
    if not operation['live_owners'] and operation['action'] != 'close':
        raise ValueError('Only close checkpoints may be empty')
    for row in checkpoints:
        if (row['step_id'] != operation['step_id'] or row['action'] != operation['action'] or
            type(row['revision']) is not int or row['revision'] != operation['live_owners'][row['document']]):
            raise ValueError('Live checkpoint revision mismatch')


def extract_checkpoint(work, document, path, request_id, step_id, action, request_record=None):
    verify_private(work)
    path = private_path(work, path); payload = read_private(work, path)
    raw = parse_json(payload)
    plus_v8 = document.get('document') == 'plus' and any('v8_numeric_representation_policy' in b or 'v8_root_representation_policy' in b
        for view in ('boxes','full_inventory') for b in document.get(view,[]))
    if plus_v8:
        if type(request_record) is not dict: raise ValueError('Trusted plus V8 causing-operation record required')
        for key,value in dict(request_id=request_id,step_id=step_id,action=action,document=document['document'],revision=document['revision'],
                source_sha256=document['source_sha256'],working_path=document['working_windows_path']).items():
            if type(request_record.get(key)) is not type(value) or request_record[key]!=value:raise ValueError('Trusted plus V8 request binding changed')
        for key in ('operation_request_id','action_document','action_revision'):
            if key not in raw or type(request_record.get(key)) is not type(raw[key]) or request_record[key]!=raw[key]:raise ValueError('Trusted plus V8 causing-operation binding changed')
        if type(request_record.get('operation_request_id')) is not int or request_record['operation_request_id']<1:
            raise ValueError('Trusted plus V8 operation identity unavailable')
        for key in ('request_id','step_id','action','document','revision','source_sha256'):
            if type(raw.get(key)) is not type(request_record[key]) or raw[key]!=request_record[key]:raise ValueError('Trusted plus V8 raw binding changed')
        result = validate_checkpoint(document,raw,request_id,step_id,action)
    binding = retain_raw(path.with_name('retained-' + path.name), payload)
    if request_record is not None: request_record.update(binding)
    if not plus_v8: result = validate_checkpoint(document, raw, request_id, step_id, action)
    verify_private(work)
    return dict(result, **binding)


def public_receipt(row):
    result = {key: row[key] for key in ('seq', 'request_id', 'step_id', 'action', 'action_document', 'action_revision',
        'document', 'revision', 'source_sha256', 'kind', 'anchor', 'port', 'synchronous_dispatch_active',
        'closed_owner_absence_validated') if key in row}
    if 'message' in row:
        message = validate_message(row['message'])
        result.update(message_sha256=hashlib.sha256(canonical(message)).hexdigest(), selector=message['selector'],
            atom_count=len(message['atoms']), atom_tags=[a['tag'] for a in message['atoms']])
    if row.get('kind') == 'harness-error': result['error_sha256'] = hashlib.sha256(str(row.get('error')).encode()).hexdigest()
    return result


def public_checkpoint(row):
    return {key: row[key] for key in ('request_id', 'operation_request_id', 'step_id', 'action', 'action_document',
        'action_revision', 'document', 'revision', 'source_sha256', 'readback_method', 'retention', 'raw_sha256', 'raw_bytes') if key in row} | dict(
            numeric_state_count=len(row['numeric_states']), numeric_anchors=[v['anchor'] for v in row['numeric_states']])


def public_operation(operation):
    return {key: operation[key] for key in ('request_id', 'step_id', 'action', 'document', 'source_sha256',
        'action_revision', 'live_owners', 'checkpoint_request_ids', 'working_paths')}


def validate_numeric_progress(document, checkpoint, receipts, prior, initial=False):
    for state in checkpoint['numeric_states']:
        key = (document['document'], document['revision'], state['anchor'])
        source = next(b for b in document['boxes'] if b['anchor'] == state['anchor'])
        outputs = [r for r in receipts if r.get('kind') == 'receipt' and r.get('document') == document['document'] and
            r.get('revision') == document['revision'] and r.get('anchor') == state['anchor'] and r.get('port') == 0]
        expected = source['initial_numeric'] if initial else prior.get(key)
        if outputs:
            message = validate_message(outputs[-1]['message'])
            if message['selector'] != state['semantic_tag']: raise ValueError('UI outlet type mismatch')
            expected = message['atoms'][0]['value']
        if expected is None or state['value'] != expected: raise ValueError('Getter differs from actual or retained UI state')
        prior[key] = state['value']


def preparation_manifest_path(name='preparation-manifest.json'):
    if type(name) is not str or not re.fullmatch(r'preparation-manifest(?:-[A-Za-z0-9_][A-Za-z0-9_-]*)?\.json', name):
        raise ValueError('Finite preparation manifest name required')
    path = ROOT / name
    if path.is_symlink(): raise ValueError('Manifest symlink refused')
    return path


def prepare_private(work, resources=common.RESOURCES, manifest_name='preparation-manifest.json'):
    work = Path(work).absolute(); cache = Path.home() / '.cache/alive-ultra-evidence'
    manifest_path = preparation_manifest_path(manifest_name)
    if (work.resolve() != work or cache not in work.parents or REPO in work.parents or work.exists() or
        manifest_path.exists()):
        raise ValueError('Fresh private evidence directory and unconsumed manifest required')
    argument = windows_path(work / 'config.json')
    if any(c.isspace() or c == '"' for c in argument): raise ValueError('Whitespace-free config path required')
    docs, public, helpers = source_metadata(resources); package = package_binding(); dependency = dependency_binding()
    work.mkdir(parents=True, mode=0o700)
    for folder in ('pristine', 'working', 'observations', 'helpers'): (work / folder).mkdir(mode=0o700)
    for helper in helpers: retain_raw(work / 'helpers' / helper['name'], (Path(resources) / helper['path']).read_bytes())
    revisions = []
    for doc in docs:
        source_bytes = Path(doc['source_path']).read_bytes()
        for revision in (1, 2):
            pristine = work / 'pristine' / f"{doc['document']}-r{revision}.maxhelp"
            working = work / 'working' / pristine.name
            retain_raw(pristine, source_bytes); retain_raw(working, source_bytes)
            revisions.append(dict(doc, revision=revision, pristine_path=str(pristine), working_path=str(working),
                working_windows_path=windows_path(working), lifecycle_owner_inlet=len(revisions)))
    for name in ('controller.js', 'observer.js', 'v8-readback.js', 'lifecycle-observer.js'):
        retain_raw(work / name, (ROOT / name).read_bytes())
    config = dict(schema_version=1, policy='max-help-arithmetic-three-v1', work=str(work), documents=revisions,
        preparation_manifest=manifest_name,
        helpers=helpers, source_metadata=public, package_sha256=package['package_files'], dependency_sha256=dependency,
        score_binding=score_binding(), readback_method='v8-numeric-getvalueof',
        global_name='alive_arithmetic_' + secrets.token_hex(12),
        journal_path=windows_path(work / 'private-journal.jsonl'), observer_path=windows_path(work / 'observer.js'),
        readback_helper_path=windows_path(work / 'v8-readback.js'),
        **{name + '_path': windows_path(work / (name + '.json')) for name in ('command', 'ack', 'ready')})
    epoch = secrets.token_hex(24)
    def strings(value):
        if type(value) is str:
            yield value; yield from value.split()
        elif type(value) is dict:
            for key, item in value.items(): yield from strings(key); yield from strings(item)
        elif type(value) is list:
            for item in value: yield from strings(item)
    forbidden = set(strings(load_score()))
    for doc in docs: forbidden.update(strings(parse_json(Path(doc['source_path']).read_bytes())))
    owners = []
    for inlet, definition in enumerate(revisions):
        channel = '__alive_arithmetic_lifecycle_' + epoch + '_' + str(inlet)
        if channel in forbidden: raise ValueError('Lifecycle channel collision')
        owners.append(dict(document=definition['document'], revision=definition['revision'],
            source_sha256=definition['source_sha256'], working_path=definition['working_windows_path'],
            channel=channel, inlet=inlet, root_proof_path=windows_path(work / 'observations' /
                f"lifecycle-root-{definition['document']}-r{definition['revision']}.json")))
    inventory = [dict(varname='__alive_arithmetic_controller', maxclass='js',
        boxtext='js controller.js ' + argument, rect=[20, 20, 350, 50]),
        dict(varname='__alive_arithmetic_lifecycle_observer', maxclass='v8',
        boxtext='v8 lifecycle-observer.js ' + argument, rect=[-2000, -2000, 300, 50])]
    inventory.extend(dict(varname='__alive_arithmetic_lifecycle_receive_' + str(o['inlet']), maxclass='receive',
        boxtext='receive ' + o['channel'], rect=[-2000, -2100 - 30 * o['inlet'], 300, 50]) for o in owners)
    config['lifecycle'] = dict(version='arithmetic-freebang-v1', monitor_epoch=epoch,
        observer_path=windows_path(work / 'lifecycle-observer.js'), report_path=windows_path(work / 'lifecycle-report.json'),
        driver_inventory=inventory, owners=owners)
    driver = dict(patcher=dict(fileversion=1, rect=[0, 0, 400, 160], locked=1,
        boxes=[dict(box=dict(id=e['varname'], varname=e['varname'], maxclass='newobj', text=e['boxtext'], patching_rect=e['rect'])) for e in inventory],
        lines=[dict(patchline=dict(source=['__alive_arithmetic_lifecycle_receive_' + str(o['inlet']), 0],
            destination=['__alive_arithmetic_lifecycle_observer', o['inlet'] + 1])) for o in owners]))
    write_json(work / 'driver.maxpat', driver); write_json(work / 'config.json', config)
    files = {str(path.relative_to(work)): digest(path) for path in work.rglob('*') if path.is_file()}
    write_json(work / 'seal.json', dict(files=files, score_binding=score_binding(), package_binding=package,
        dependency_sha256=dependency))
    write_json(manifest_path, dict(schema_version=1, status='PREPARED_NOT_EXECUTED', manifest_name=manifest_name,
        runtime_invocations=0, private_work=str(work), private_config_sha256=digest(work / 'config.json'),
        private_seal_sha256=digest(work / 'seal.json'), score_binding=score_binding(), package_binding=package,
        dependency_sha256=dependency, source_metadata=public, helpers=helpers,
        operation_count=78, event_count=66, live_checkpoint_count=72, empty_checkpoint_count=6,
        numeric_state_count=504, expected_original_outlet_count=141, final_live_owners={}))
    verify_private(work)
    return config


def validate_preparation_manifest(work, manifest):
    if (manifest.get('private_work') != str(Path(work).absolute()) or manifest.get('score_binding') != score_binding() or
        manifest.get('package_binding') != package_binding() or manifest.get('dependency_sha256') != dependency_binding()):
        raise ValueError('Reviewed arithmetic preparation manifest changed')
    for filename, field in (('config.json', 'private_config_sha256'), ('seal.json', 'private_seal_sha256')):
        if hashlib.sha256(read_private(work, Path(work) / filename)).hexdigest() != manifest.get(field):
            raise ValueError('Private manifest content binding changed')


def verify_private(work):
    work = Path(work).absolute()
    config = parse_json(read_private(work, work / 'config.json'))
    manifest_path = preparation_manifest_path(config.get('preparation_manifest'))
    manifest = parse_json(manifest_path.read_bytes())
    if manifest.get('manifest_name') != manifest_path.name: raise ValueError('Manifest name binding changed')
    validate_preparation_manifest(work, manifest)
    seal = parse_json(read_private(work, work / 'seal.json'))
    if (config.get('work') != str(work) or config.get('policy') != 'max-help-arithmetic-three-v1' or
        config.get('score_binding') != score_binding() or seal.get('score_binding') != score_binding() or
        config.get('package_sha256') != package_binding()['package_files'] or seal.get('package_binding') != package_binding() or
        config.get('dependency_sha256') != dependency_binding() or seal.get('dependency_sha256') != dependency_binding()):
        raise ValueError('Private package/config/score binding changed')
    for filename, sha in seal['files'].items():
        if hashlib.sha256(read_private(work, work / filename)).hexdigest() != sha: raise ValueError('Private sealed bytes changed')
    if {(d['document'], d['revision']) for d in config['documents']} != {(name, revision) for name in IDENTITIES for revision in (1, 2)} or len(config['documents']) != 6:
        raise ValueError('Exact six source revisions required')
    for definition in config['documents']:
        if definition['source_sha256'] != IDENTITIES[definition['document']]: raise ValueError('Private source identity changed')
        common.require_digest(definition['source_path'], definition['source_sha256'])
        for key in ('pristine_path', 'working_path'):
            if hashlib.sha256(read_private(work, definition[key])).hexdigest() != definition['source_sha256']:
                raise ValueError('Private pristine/working source changed')
    common.require_helpers(common.RESOURCES, config['helpers'])
    for helper in config['helpers']:
        if hashlib.sha256(read_private(work, work / 'helpers' / helper['name'])).hexdigest() != HELPERS[helper['name']]:
            raise ValueError('Private helper changed')
    for path in work.rglob('*'):
        if path.is_dir(): _directory(path)
        else:
            info = path.lstat()
            if not stat.S_ISREG(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o600 or info.st_nlink != 1:
                raise ValueError('Private runtime file type or mode changed')
    return config


def preparation_binding(work):
    config = verify_private(work)
    return dict(package_binding(), private_config_sha256=digest(Path(work) / 'config.json'),
        private_seal_sha256=digest(Path(work) / 'seal.json'),
        preparation_manifest_sha256=digest(preparation_manifest_path(config['preparation_manifest'])))
