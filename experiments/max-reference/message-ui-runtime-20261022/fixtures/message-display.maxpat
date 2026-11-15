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
    "classnamespace": "box",
    "rect": [
      0,
      0,
      1200,
      800
    ],
    "openinpresentation": 0,
    "boxes": [
      {
        "box": {
          "id": "template",
          "varname": "template",
          "maxclass": "message",
          "patching_rect": [
            30,
            100,
            220,
            28
          ],
          "text": "saved $1 $2"
        }
      },
      {
        "box": {
          "id": "empty",
          "varname": "empty",
          "maxclass": "message",
          "patching_rect": [
            290,
            100,
            220,
            28
          ],
          "text": ""
        }
      },
      {
        "box": {
          "id": "literal",
          "varname": "literal",
          "maxclass": "message",
          "patching_rect": [
            550,
            100,
            220,
            28
          ],
          "text": "fixed 7 pear"
        }
      },
      {
        "box": {
          "id": "harness",
          "varname": "harness",
          "maxclass": "newobj",
          "text": "js probe-display.js message-display",
          "numinlets": 64,
          "numoutlets": 64,
          "patching_rect": [
            30,
            30,
            600,
            28
          ]
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "harness",
            0
          ],
          "destination": [
            "template",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            1
          ],
          "destination": [
            "template",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "template",
            0
          ],
          "destination": [
            "harness",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            2
          ],
          "destination": [
            "empty",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            3
          ],
          "destination": [
            "empty",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "empty",
            0
          ],
          "destination": [
            "harness",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            4
          ],
          "destination": [
            "literal",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            5
          ],
          "destination": [
            "literal",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "literal",
            0
          ],
          "destination": [
            "harness",
            2
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            0
          ],
          "destination": [
            "harness",
            63
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            1
          ],
          "destination": [
            "harness",
            63
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            2
          ],
          "destination": [
            "harness",
            63
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            3
          ],
          "destination": [
            "harness",
            63
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            4
          ],
          "destination": [
            "harness",
            63
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            5
          ],
          "destination": [
            "harness",
            63
          ]
        }
      }
    ]
  }
}
