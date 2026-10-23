# Alive / Ultra licensing

Alive / Ultra's original project code, tests, and accompanying project documentation
are licensed under **GNU Affero General Public License version 3 or, at your option,
any later version** (`AGPL-3.0-or-later`), unless a file states otherwise.
The complete, unmodified license text is in [LICENSE](LICENSE).

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See LICENSE for the full terms.

## Third-party material

This project-wide designation does not replace or alter the licenses of upstream
code, generated third-party material, dependencies, or their notices. Retain all
applicable copyright statements, exceptions, license texts, and attribution.

- Clockwork at the selected revision is used under `AGPL-3.0-or-later`. No
  alternative commercial license has been obtained or is required as a project
  policy for this AGPL path; each actual distribution still needs compliance review.
- Faust-generated output, imported DSP functions and architecture headers retain
  their applicable notices and exceptions. The compiler's license is not a
  substitute for checking those inputs.
- Pd/libpd, Cyclone, Tauri, Rust crates and system GUI/audio libraries retain their
  respective terms. Optional build components require their own inventory.
- Plugdata and SoundCraft are research references, not incorporated source code.
  Future code reuse must retain the applicable upstream license; our project
  license does not automatically relicense material taken from another project.

See [apps/ultra/THIRD-PARTY.txt](apps/ultra/THIRD-PARTY.txt), the dependency manifests
and source notices for component-specific information. These inventories are not
an exhaustive legal clearance of every possible build configuration.

## Distribution

For distributed builds, provide the applicable license texts, notices and complete
Corresponding Source, including required build scripts, in accordance with LICENSE
and each dependency's terms. A modified network-interactive version must also
satisfy AGPL section 13. An executable or a source link alone is not a compliance
checklist for every distribution method.

This choice does not automatically apply to users' independently authored music
or project data merely because they use the application. Templates, copied code,
generated runtime code and linked extensions can carry separate obligations.
No additional exception is granted by this explanatory note.

The choice of license does not authorize changing repository visibility, publishing
a release, or distributing third-party proprietary assets. Release compliance and
any future plugin/runtime combination remain subject to component review.
