"""Navigate the shared shell before the existing native journey's control actions."""
import re
from gi.repository import Atspi


def install(ui, windows):
    click, text = ui.click, ui.text
    diagnostic = {'Audio backend', 'Audio device', 'Audio sample rate', 'Audio buffer frames',
                  'Audio callbacks', 'Audio stream errors', 'Audio failed', 'Audio status',
                  'Transport playing', 'Absolute frame', 'Rejected commands', 'Native generation',
                  'Stream diagnostics'}

    def expand(name):
        control = ui.wait_for(name)
        if not control.get_state_set().contains(Atspi.StateType.EXPANDED):
            click(name)

    def prepare(name):
        if windows.scope != 'Alive':
            return
        if name in diagnostic or re.fullmatch(r'Track \d+ active voices', name):
            expand('Audio details')
            return
        device = (name == 'Edit selected device in Ultra' or
                  re.search(r' (?:base(?: slider)?|effective ownership)$', name) or
                  re.fullmatch(r'(?:Select|Bypass|Move|Remove|Replace) .+ (?:instrument|effect \d+)(?: earlier| later)?', name))
        notes = re.match(r'Note \d+ ', name)
        automation = ('automation enabled' in name or ' point' in name or
                      name in ('Automation target', 'Add automation lane'))
        clip = notes or automation or name in ('Selected clip piano roll', 'Selected note velocity', 'Add note')
        track_action = re.fullmatch(r'(?:Open (.+) editor|Replace (.+) device|Remove (.+) track)', name)
        surface = device or clip or track_action or re.fullmatch(r'(?:Pulse|Harmony|Track \d+) (?:gain|mute|solo)', name)
        if not surface:
            return
        details = ui.wait_for('Audio details')
        if details.get_state_set().contains(Atspi.StateType.EXPANDED):
            click('Audio details')
        if device or clip:
            tab = 'Devices detail' if device else 'Clip detail'
            if not ui.wait_for(tab).get_state_set().contains(Atspi.StateType.PRESSED):
                click(tab)
            if notes:
                expand('Note inspector')
            if automation:
                expand('Automation inspector')
        if track_action:
            track = next(value for value in track_action.groups() if value)
            column = ui.wait_for(track + ' track')
            summary = next(item for item in ui.walk(column) if item.get_name() == 'Device / track')
            if not summary.get_state_set().contains(Atspi.StateType.EXPANDED):
                Atspi.Component.grab_focus(summary)
                ui.keys('Return')

    def visible_click(name):
        prepare(name)
        click(name)

    def visible_text(name, value):
        prepare(name)
        text(name, value)

    ui.click, ui.text = visible_click, visible_text
    return prepare
