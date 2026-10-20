{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 9,
      "minor": 1,
      "revision": 5,
      "architecture": "x64"
    },
    "classnamespace": "box",
    "rect": [
      30,
      70,
      720,
      450
    ],
    "openinpresentation": 0,
    "default_fontsize": 12,
    "boxes": [
      {
        "box": {
          "id": "bang",
          "maxclass": "button",
          "patching_rect": [
            40,
            60,
            24,
            24
          ]
        }
      },
      {
        "box": {
          "id": "toggle",
          "maxclass": "toggle",
          "patching_rect": [
            130,
            60,
            24,
            24
          ]
        }
      },
      {
        "box": {
          "id": "number",
          "maxclass": "number",
          "patching_rect": [
            220,
            60,
            60,
            22
          ]
        }
      },
      {
        "box": {
          "id": "flonum",
          "maxclass": "flonum",
          "patching_rect": [
            310,
            60,
            60,
            22
          ]
        }
      },
      {
        "box": {
          "id": "slider",
          "maxclass": "slider",
          "patching_rect": [
            40,
            130,
            140,
            22
          ],
          "orientation": 1
        }
      },
      {
        "box": {
          "id": "log",
          "maxclass": "newobj",
          "patching_rect": [
            40,
            250,
            200,
            22
          ],
          "text": "js ui-query.js"
        }
      },
      {
        "box": {
          "id": "dump",
          "maxclass": "message",
          "patching_rect": [
            300,
            210,
            60,
            22
          ],
          "text": "dump"
        }
      },
      {
        "box": {
          "id": "load",
          "maxclass": "newobj",
          "patching_rect": [
            450,
            60,
            60,
            22
          ],
          "text": "loadbang"
        }
      },
      {
        "box": {
          "id": "dsp",
          "maxclass": "newobj",
          "patching_rect": [
            450,
            130,
            100,
            22
          ],
          "text": "adstatus switch"
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "bang",
            0
          ],
          "destination": [
            "log",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "toggle",
            0
          ],
          "destination": [
            "log",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "number",
            0
          ],
          "destination": [
            "log",
            2
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "flonum",
            0
          ],
          "destination": [
            "log",
            3
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "slider",
            0
          ],
          "destination": [
            "log",
            4
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "load",
            0
          ],
          "destination": [
            "dsp",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "dsp",
            1
          ],
          "destination": [
            "log",
            5
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "dump",
            0
          ],
          "destination": [
            "log",
            0
          ]
        }
      }
    ]
  }
}
