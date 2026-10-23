#!/usr/bin/env python3
"""Offline evidence-boundary tests; never launch Max or Wine."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parent
sys.dont_write_bytecode = True


class PreparationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location('help_runtime', ROOT/'help_runtime.py')
        cls.runtime = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.runtime)
        spec = importlib.util.spec_from_file_location('help_runner', ROOT/'run-runtime.py')
        cls.runner = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.runner)

    def test_private_display_excludes_host_and_existing_servers(self):
        with tempfile.TemporaryDirectory() as directory:
            base=Path(directory);(base/'.X201-lock').touch()
            (base/'.X11-unix').mkdir();(base/'.X11-unix'/'X202').touch()
            self.assertEqual(self.runner.choose_private_display(':200.0', ':0', base), ':203')
            with self.assertRaises(ValueError):self.runner.choose_private_display('', ':0', base)

    def test_cleanup_never_owns_a_same_display_process_without_capture_marker(self):
        scope=dict(capture_id='offline-test-'+os.urandom(16).hex(),prefix='/nonexistent/offline-test',display=':799')
        env=dict(os.environ,DISPLAY=scope['display'],WINEPREFIX=scope['prefix'])
        children=[]
        try:
            unrelated=subprocess.Popen([sys.executable,'-c','import time; time.sleep(15)'],env=env)
            children.append(unrelated)
            env[self.runner.CAPTURE_ENV]=scope['capture_id']
            marked=subprocess.Popen([sys.executable,'-c','import time; time.sleep(15)'],env=env)
            children.append(marked)
            rows,_=self.runner.owned(scope)
            self.assertEqual({row['pid'] for row in rows},{marked.pid})
            observation=self.runner.launch_observation(rows[0],scope)
            self.assertTrue(observation['matches_scope'])
            self.assertTrue(all(observation['field_matches'].values()))
            self.assertNotIn(scope['capture_id'],json.dumps(observation))
            self.assertNotIn(scope['prefix'],json.dumps(observation))
            self.runner.stop_owned(rows,scope)
            marked.wait(timeout=3)
            self.assertIsNone(unrelated.poll())
            self.assertEqual(self.runner.owned(scope)[0],[])
        finally:
            for child in children:
                if child.poll() is None:child.terminate()
                child.wait(timeout=3)

    def test_cleanup_rejects_changed_start_identity_and_scope(self):
        scope=dict(capture_id='offline-test-'+os.urandom(16).hex(),prefix='/nonexistent/offline-test',display=':798')
        env=dict(os.environ,DISPLAY=scope['display'],WINEPREFIX=scope['prefix'])
        env[self.runner.CAPTURE_ENV]=scope['capture_id']
        child=subprocess.Popen([sys.executable,'-c','import time; time.sleep(15)'],env=env)
        try:
            row=self.runner.owned(scope)[0][0]
            self.assertFalse(self.runner.signal_owned(dict(row,start='0'),scope,signal.SIGTERM))
            self.assertFalse(self.runner.signal_owned(row,dict(scope,capture_id='other'),signal.SIGTERM))
            self.assertIsNone(child.poll())
        finally:
            child.terminate();child.wait(timeout=3)

    def test_loading_diagnostics_redact_unexpected_paths_and_class_names(self):
        config=dict(work='/private/test',documents=[dict(document='append',working_windows_path='Z:/private/test/working/append.maxhelp')])
        diagnostics=[dict(document='append',filepath='source-path-sentinel',tree_boxes=0,
                          top_boxes=[dict(ordinal=0,maxclass='source-class-sentinel',basic_named=False)])]
        value=self.runner.public_loading_diagnostics(diagnostics,config)
        self.assertNotIn('sentinel',json.dumps(value))
        self.assertEqual(value[0]['tree_boxes'],0)

    def test_window_diagnostics_hash_private_titles_and_strip_unrecognized_fields(self):
        raw=dict(status='observed',windows=[dict(window=12,parent=1,transient_for=9,
            title='source-prose-sentinel Save As',private_payload='source-payload-sentinel')],
            x_errors=[3],truncated=False,private_path='source-path-sentinel')
        value=self.runner.public_window_diagnostics(raw)
        self.assertEqual(value['windows'][0]['title_sha256'],
            hashlib.sha256(raw['windows'][0]['title'].encode()).hexdigest())
        self.assertTrue(value['windows'][0]['save_title_token'])
        self.assertFalse(value['windows'][0]['authorization_title_token'])
        self.assertEqual(value['windows'][0]['transient_for'],9)
        self.assertNotIn('sentinel',json.dumps(value))
        raw['windows'][0]['title']='Max Authorization'
        self.assertTrue(self.runner.public_window_diagnostics(raw)['windows'][0]['authorization_title_token'])
        raw['windows'][0]['title']='source-filename-sentinel (Saving Disabled)'
        value=self.runner.public_window_diagnostics(raw)
        self.assertTrue(value['windows'][0]['save_title_token'])
        self.assertTrue(value['windows'][0]['saving_disabled_title'])
        self.assertNotIn('sentinel',json.dumps(value))
        raw['windows'][0]['title']='source-filename-sentinel(saving disabled)'
        self.assertTrue(self.runner.public_window_diagnostics(raw)['windows'][0]['saving_disabled_title'])

    def test_window_diagnostics_refuse_unexpected_status_and_noninteger_ids(self):
        for raw in [dict(status='source-error-sentinel',windows=[],x_errors=[],truncated=False),
                    dict(status='observed',windows=[dict(window='source-title-sentinel',parent=1,
                        transient_for=None,title='title')],x_errors=[],truncated=False)]:
            with self.assertRaises(ValueError):self.runner.public_window_diagnostics(raw)

    def test_writer_diagnostics_require_fixed_boolean_or_null_fields(self):
        keys=['writer_valid','writer_class_is_thispatcher','writer_owner_is_root',
            'writer_owner_path_matches','writer_understands_write','root_is_top_level','root_locked','root_dirty']
        raw={key:True for key in keys};raw['root_dirty']=None;raw['private_payload']='source-payload-sentinel'
        value=self.runner.public_writer_diagnostics(raw)
        self.assertEqual(set(value),set(keys));self.assertIsNone(value['root_dirty'])
        self.assertNotIn('sentinel',json.dumps(value))
        for invalid in [dict(raw,root_dirty='source-error-sentinel'),dict(raw,root_dirty=1),{}]:
            with self.assertRaises(ValueError):self.runner.public_writer_diagnostics(invalid)

    def test_anchor_diagnostics_retain_only_geometry_counts_and_class_identities(self):
        raw=[dict(expected_anchor='root/obj-5/obj-26',expected_id='obj-26',expected_rect=[10,20,80,20],
            expected_maxclass='comment',expected_runtime_class='source-class-sentinel',full_match_count=0,
            position_class_match_count=1,full_matches=[],source_payload='source-prose-sentinel',
            position_class_matches=[dict(ordinal=3,rect=[10,20,100,25],maxclass='comment',
                text='source-text-sentinel',label='source-label-sentinel')])]
        value=self.runner.public_anchor_diagnostics(raw)
        self.assertEqual(value[0]['expected_rect'],[10,20,80,20])
        self.assertEqual(value[0]['full_match_count'],0)
        self.assertEqual(value[0]['position_class_match_count'],1)
        self.assertEqual(value[0]['position_class_matches'],[dict(ordinal=3,rect=[10,20,100,25],maxclass='comment')])
        self.assertNotIn('sentinel',json.dumps(value))
        self.assertIn('expected_runtime_class_sha256',value[0])

    def test_anchor_geometry_observations_keep_finite_arrays_without_payload(self):
        candidate=dict(ordinal=0,maxclass='comment',rect=[10.5,20.5,100.934143,25],raw_rect=[10,20,110,45],
            patching_rect_status='observed',patching_rect=[10.5,20.5,100.934143,25],
            getattr_patching_rect_status='malformed',getattr_patching_rect=None,payload='source-payload-sentinel')
        raw=[dict(expected_anchor='root/obj-5/obj-26',expected_id='obj-26',expected_rect=[10.5,20.5,100.934143,25],
            expected_maxclass='comment',expected_runtime_class='comment',full_match_count=2,
            position_class_match_count=2,full_matches=[],position_class_matches=[],candidates=[candidate])]
        value=self.runner.public_anchor_diagnostics(raw)
        self.assertEqual(value[0]['candidates'][0]['raw_rect'],[10,20,110,45])
        self.assertEqual(value[0]['candidates'][0]['patching_rect'],[10.5,20.5,100.934143,25])
        self.assertEqual(value[0]['candidates'][0]['getattr_patching_rect_status'],'malformed')
        self.assertNotIn('sentinel',json.dumps(value))
        candidate['patching_rect']=[10,20,float('inf'),25]
        with self.assertRaises(ValueError):self.runner.public_anchor_diagnostics(raw)

    def launch_observation(self,match,start='41'):
        return dict(pid=71001,expected_start='41',observed_start=start,start_match=start=='41',
            environment_readable=True,field_matches={key:True for key in ['capture_marker','prefix','display']},
            matches_scope=match)

    def test_launch_identity_waits_for_full_scope_after_transient_mismatch(self):
        child=Mock(pid=71001);child.poll.return_value=None;diagnostics=[]
        scope=dict(capture_id='marker',prefix='/private/prefix',display=':200')
        with patch.object(self.runner,'process_start',return_value='41'),patch.object(
                self.runner,'launch_observation',side_effect=[self.launch_observation(False),self.launch_observation(True)]):
            row=self.runner.launched_identity(child,scope,diagnostics=diagnostics,timeout=.1)
        self.assertEqual(row,dict(pid=71001,start='41'))
        self.assertEqual(diagnostics[0]['status'],'verified')
        self.assertEqual([sample['matches_scope'] for sample in diagnostics[0]['attempts']],[False,True])

    def test_launch_identity_persistent_mismatch_fails_with_sanitized_diagnostics(self):
        child=Mock(pid=71001);child.poll.return_value=None;diagnostics=[]
        scope=dict(capture_id='private-marker-sentinel',prefix='/private-prefix-sentinel',display=':200')
        with patch.object(self.runner,'process_start',return_value='41'),patch.object(
                self.runner,'launch_observation',side_effect=lambda row,scope:self.launch_observation(False)):
            with self.assertRaises(RuntimeError):
                self.runner.launched_identity(child,scope,diagnostics=diagnostics,timeout=.001)
        self.assertEqual(diagnostics[0]['status'],'persistent-scope-mismatch')
        self.assertNotIn('sentinel',json.dumps(diagnostics))
        self.assertTrue(diagnostics[0]['attempts'])

    def test_launch_identity_child_exit_fails_closed(self):
        child=Mock(pid=71001);child.poll.side_effect=[None,1];diagnostics=[]
        scope=dict(capture_id='marker',prefix='/private/prefix',display=':200')
        with patch.object(self.runner,'process_start',return_value='41'),patch.object(
                self.runner,'launch_observation',return_value=self.launch_observation(True)):
            with self.assertRaises(RuntimeError):
                self.runner.launched_identity(child,scope,diagnostics=diagnostics,timeout=.1)
        self.assertEqual(diagnostics[0]['status'],'child-exited')

    def test_launch_identity_start_change_fails_without_retry(self):
        child=Mock(pid=71001);child.poll.return_value=None;diagnostics=[]
        scope=dict(capture_id='marker',prefix='/private/prefix',display=':200')
        with patch.object(self.runner,'process_start',return_value='41'),patch.object(
                self.runner,'launch_observation',side_effect=lambda row,scope:self.launch_observation(False,start='42')):
            with self.assertRaises(RuntimeError):
                self.runner.launched_identity(child,scope,diagnostics=diagnostics,timeout=.1)
        self.assertEqual(diagnostics[0]['status'],'start-identity-changed')
        self.assertEqual(len(diagnostics[0]['attempts']),1)

    def test_controller_opens_exact_roots_and_waits_for_loaded_path(self):
        subprocess.run(['node',str(ROOT/'test_controller.cjs')],check=True,capture_output=True,text=True)

    def test_changed_source_is_refused(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'source.maxhelp'
            path.write_bytes(b'original source identity')
            expected = hashlib.sha256(path.read_bytes()).hexdigest()
            self.runtime.require_digest(path, expected)
            path.write_bytes(b'changed source identity')
            with self.assertRaises(ValueError):
                self.runtime.require_digest(path, expected)

    def test_all_four_helpers_are_bound_and_changed_copy_is_refused(self):
        with tempfile.TemporaryDirectory() as directory:
            base=Path(directory);helpers=[]
            for name in ['helpstarter.js','helpname.js','helpdetails.js','helpargs.js']:
                path=base/'help/resources'/name;path.parent.mkdir(parents=True,exist_ok=True)
                path.write_text('original-test-helper-'+name)
                helpers.append(dict(name=name,path='help/resources/'+name,bytes=path.stat().st_size,
                                    sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
            self.runtime.require_helpers(base,helpers)
            with self.assertRaises(ValueError):self.runtime.require_helpers(base,helpers[:-1])
            (base/'help/resources/helpargs.js').write_text('changed-test-helper')
            with self.assertRaises(ValueError):self.runtime.require_helpers(base,helpers)

    def test_only_exact_disconnected_append_annotation_gets_width_profile(self):
        box=dict(id='obj-4',maxclass='jsui',filename='helpargs.js',ignoreclick=1,numoutlets=1,
                 patching_rect=[130,195,257.934143,39])
        source='d4a3fe4d87f7fd7b30c747cc18cc09f7ba6dd703adadc279733df38503962729'
        helper='04cce1cb44b358680d9c6d3ef19873fa5ccbb192614905dc909057cf22805469'
        derive=self.runtime.derive_annotation_width_policy
        profile=derive('append',source,'root/obj-5/obj-4',box,[],helper)
        self.assertEqual(profile['anchor'],'root/obj-5/obj-4')
        self.assertEqual(profile['source_outlets'],1)
        self.assertEqual(profile['observer_policy'],'omit-disconnected-annotation-leaf')
        cases=[('prepend',source,'root/obj-5/obj-4',box,[],helper),
               ('append','0'*64,'root/obj-5/obj-4',box,[],helper),
               ('append',source,'root/obj-5/obj-99',box,[],helper),
               ('append',source,'root/obj-5/obj-4',box,[],'0'*64),
               ('append',source,'root/obj-5/obj-4',dict(box,id='obj-99'),[],helper),
               ('append',source,'root/obj-5/obj-4',dict(box,maxclass='newobj'),[],helper),
               ('append',source,'root/obj-5/obj-4',dict(box,filename='helpdetails.js'),[],helper),
               ('append',source,'root/obj-5/obj-4',dict(box,ignoreclick=0),[],helper),
               ('append',source,'root/obj-5/obj-4',dict(box,numoutlets=0),[],helper),
               ('append',source,'root/obj-5/obj-4',dict(box,patching_rect=[130,195,258,39]),[],helper),
               ('append',source,'root/obj-5/obj-4',box,[dict(source=['obj-4',0],destination=['obj-9',0])],helper),
               ('append',source,'root/obj-5/obj-4',box,[dict(source=['obj-9',0],destination=['obj-4',0])],helper)]
        for args in cases:
            with self.subTest(document=args[0],anchor=args[2]):self.assertIsNone(derive(*args))

    def test_source_metadata_exposes_single_policy_and_retains_annotation_for_snapshots(self):
        with tempfile.TemporaryDirectory() as directory:
            resources=Path(directory);helpdir=resources/'help/max';helpdir.mkdir(parents=True)
            for name,(_,basic_id) in self.runtime.IDENTITIES.items():
                annotation=dict(id='obj-4',maxclass='jsui',filename='helpargs.js',ignoreclick=1,
                    numoutlets=1,patching_rect=[130,195,257.934143,39])
                fixture=dict(patcher=dict(boxes=[dict(box=dict(id=basic_id,maxclass='patcher',
                    patcher=dict(boxes=[dict(box=annotation)],lines=[])))],lines=[]))
                (helpdir/(name+'.maxhelp')).write_text(json.dumps(fixture))
            helpers=[dict(name='helpargs.js',sha256=self.runtime.ANNOTATION_HELPER_SHA256)]
            with patch.object(self.runtime,'require_digest'),patch.object(self.runtime,'helper_metadata',return_value=helpers):
                public,private=self.runtime.source_metadata(resources)
            self.assertEqual(len(public[0]['annotation_width_policies']),1)
            self.assertEqual(public[1]['annotation_width_policies'],[])
            box=private[0]['boxes'][0]
            self.assertEqual(box['outlets'],1)
            self.assertEqual(box['filename'],'helpargs.js')
            self.assertEqual(box['ignoreclick'],1)
            self.assertEqual(box['observer_policy'],'omit-disconnected-annotation-leaf')
            self.assertEqual(box['annotation_width_policy'],public[0]['annotation_width_policies'][0])
            self.assertNotIn('observer_policy',private[1]['boxes'][0])

    def test_annotation_failure_diagnostics_retain_only_pinned_policy_and_match_count(self):
        policy=dict(self.runtime.annotation_width_profile(),authored_text='source-payload-sentinel')
        raw=[dict(expected_anchor='root/obj-5/obj-4',expected_id='obj-4',expected_rect=[130,195,257.934143,39],
            expected_maxclass='jsui',expected_runtime_class='jsui',full_match_count=0,position_class_match_count=2,
            annotation_width_policy=policy,annotation_policy_match_count=2)]
        value=self.runner.public_anchor_diagnostics(raw)[0]
        self.assertEqual(value['annotation_policy_match_count'],2)
        self.assertEqual(value['full_match_count'],0)
        self.assertEqual(value['annotation_width_policy'],self.runtime.annotation_width_profile())
        self.assertNotIn('sentinel',json.dumps(value))
        policy['source_sha256']='0'*64
        with self.assertRaises(ValueError):self.runner.public_anchor_diagnostics(raw)

    def test_snapshot_cannot_target_protected_or_linked_source(self):
        with tempfile.TemporaryDirectory() as directory:
            work = Path(directory)
            pristine = work/'pristine.maxhelp'; pristine.write_text('pristine')
            working = work/'working.maxhelp'; working.write_text('working')
            config = {'working_path':str(working),'pristine_path':str(pristine),
                      'source_path':str(work/'installed.maxhelp')}
            self.assertEqual(self.runtime.snapshot_target(config),working.resolve())
            config['working_path'] = str(pristine)
            with self.assertRaises(ValueError): self.runtime.snapshot_target(config)
            linked = work/'linked.maxhelp'; linked.hardlink_to(pristine)
            config['working_path'] = str(linked)
            with self.assertRaises(ValueError): self.runtime.snapshot_target(config)

    def test_receipt_redacts_source_strings_and_keeps_observed_numeric_type(self):
        row = {'seq':4,'step_id':'p1-first','document':'prepend','kind':'receipt',
               'anchor':'root/obj-2/obj-28','port':0,
               'message':{'selector':'licensed-prefix-sentinel','atoms':[
                   {'tag':'symbol','value':'licensed-atom-sentinel'},
                   {'tag':'unknown-number','value':7}]}}
        result = self.runtime.public_row(row)
        encoded = json.dumps(result)
        self.assertNotIn('licensed-prefix-sentinel',encoded)
        self.assertNotIn('licensed-atom-sentinel',encoded)
        self.assertEqual(result['message']['atoms'][1],{'tag':'unknown-number','value':7})
        self.assertEqual(result['seq'],4)

    def test_live_text_is_distinct_from_authored_empty_and_null_is_unknown(self):
        value = self.runtime.public_message_state('licensed-state-sentinel 7', authored_empty=True)
        self.assertTrue(value['authored_empty'])
        self.assertFalse(value['live_content']['empty'])
        self.assertNotIn('licensed-state-sentinel',json.dumps(value))
        unknown = self.runtime.public_message_state(None, authored_empty=True)
        self.assertIsNone(unknown['live_content'])
        self.assertEqual(unknown['status'],'unavailable')

    def test_cold_readback_must_match_observed_content_before_claiming_display_state(self):
        expected={'selector':'list','atoms':[{'tag':'unknown-number','value':7},
                                          {'tag':'symbol','value':'source-data-sentinel'}]}
        correct=self.runtime.public_message_state('7 source-data-sentinel',True)
        self.assertTrue(self.runtime.matches_serialized_message(expected,correct))
        empty=self.runtime.public_message_state('',True)
        self.assertFalse(self.runtime.matches_serialized_message(expected,empty))
        unknown=self.runtime.public_message_state(None,True)
        self.assertFalse(self.runtime.matches_serialized_message(expected,unknown))

    def test_finite_score_has_all_rows_and_no_source_literals(self):
        score = self.runtime.build_score()
        self.assertEqual({s['row'] for s in score},{'A1','A2','A3','A4','P1','P2'})
        self.assertEqual(len({s['step_id'] for s in score}),len(score))
        self.assertEqual([s['ordinal'] for s in score],list(range(len(score))))
        for step in score:
            self.assertIn(step['message']['selector'],{'int','bang'})
            self.assertTrue(all(isinstance(a['value'],int) for a in step['message']['atoms']))

    def test_leaf_scripts_do_not_forward_or_disconnect_original_routes(self):
        observer = (ROOT/'observer.js').read_text()
        controller = (ROOT/'controller.js').read_text()
        self.assertNotIn('outlet(',observer)
        self.assertNotIn('outlet.apply',observer)
        self.assertNotIn('.disconnect(',controller)

    def test_default_runner_is_plan_only(self):
        result = subprocess.run([sys.executable,str(ROOT/'run-runtime.py')],
                                capture_output=True,text=True,check=True)
        plan = json.loads(result.stdout)
        self.assertEqual(plan['status'],'PREPARED_NOT_EXECUTED')
        self.assertFalse(plan['runtime_started'])
        self.assertTrue(plan['requires_explicit_execute'])


if __name__ == '__main__':
    unittest.main()
