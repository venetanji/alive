{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 9,
      "minor": 1,
      "revision": 5,
      "architecture": "x64",
      "modernui": 1
    },
    "rect": [
      80,
      80,
      1100,
      600
    ],
    "locked": 1,
    "default_fontsize": 13,
    "default_fontname": "Arial",
    "boxes": [
      {
        "box": {
          "id": "title",
          "maxclass": "comment",
          "patching_rect": [
            30,
            25,
            1000,
            30
          ],
          "text": "Original Print Popup Probe",
          "fontsize": 22
        }
      },
      {
        "box": {
          "id": "quiet",
          "maxclass": "newobj",
          "patching_rect": [
            50,
            180,
            240,
            24
          ],
          "text": "print QUIET @popup 0",
          "varname": "quiet",
          "numinlets": 1,
          "numoutlets": 0
        }
      },
      {
        "box": {
          "id": "popup",
          "maxclass": "newobj",
          "patching_rect": [
            380,
            180,
            240,
            24
          ],
          "text": "print POP @popup 1",
          "varname": "popup",
          "numinlets": 1,
          "numoutlets": 0
        }
      },
      {
        "box": {
          "id": "default",
          "maxclass": "newobj",
          "patching_rect": [
            710,
            180,
            240,
            24
          ],
          "text": "print",
          "varname": "default",
          "numinlets": 1,
          "numoutlets": 0
        }
      },
      {
        "box": {
          "id": "harness",
          "maxclass": "newobj",
          "patching_rect": [
            30,
            340,
            200,
            22
          ],
          "text": "js probe.js",
          "varname": "harness",
          "numinlets": 2,
          "numoutlets": 0
        }
      },
      {
        "box": {
          "id": "audio",
          "maxclass": "newobj",
          "patching_rect": [
            30,
            390,
            180,
            22
          ],
          "text": "adstatus switch",
          "varname": "audio",
          "numinlets": 1,
          "numoutlets": 1
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "audio",
            0
          ],
          "destination": [
            "harness",
            1
          ]
        }
      }
    ]
  }
}
