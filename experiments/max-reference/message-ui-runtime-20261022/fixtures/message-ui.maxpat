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
          "id": "integer",
          "varname": "integer",
          "maxclass": "number",
          "patching_rect": [
            810,
            100,
            220,
            28
          ]
        }
      },
      {
        "box": {
          "id": "bounded",
          "varname": "bounded",
          "maxclass": "number",
          "patching_rect": [
            30,
            190,
            220,
            28
          ],
          "minimum": -5,
          "maximum": 5
        }
      },
      {
        "box": {
          "id": "fractional",
          "varname": "fractional",
          "maxclass": "flonum",
          "patching_rect": [
            290,
            190,
            220,
            28
          ]
        }
      },
      {
        "box": {
          "id": "intstore",
          "varname": "intstore",
          "maxclass": "newobj",
          "patching_rect": [
            550,
            190,
            220,
            28
          ],
          "text": "int 3"
        }
      },
      {
        "box": {
          "id": "floatstore",
          "varname": "floatstore",
          "maxclass": "newobj",
          "patching_rect": [
            810,
            190,
            220,
            28
          ],
          "text": "float 3.5"
        }
      },
      {
        "box": {
          "id": "receiver_a",
          "varname": "receiver_a",
          "maxclass": "newobj",
          "patching_rect": [
            30,
            280,
            220,
            28
          ],
          "text": "receive message_ui_probe"
        }
      },
      {
        "box": {
          "id": "receiver_b",
          "varname": "receiver_b",
          "maxclass": "newobj",
          "patching_rect": [
            290,
            280,
            220,
            28
          ],
          "text": "receive message_ui_probe"
        }
      },
      {
        "box": {
          "id": "harness",
          "varname": "harness",
          "maxclass": "newobj",
          "text": "js probe.js message-ui",
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
            6
          ],
          "destination": [
            "integer",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "integer",
            0
          ],
          "destination": [
            "harness",
            3
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "integer",
            1
          ],
          "destination": [
            "harness",
            4
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            7
          ],
          "destination": [
            "bounded",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "bounded",
            0
          ],
          "destination": [
            "harness",
            5
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "bounded",
            1
          ],
          "destination": [
            "harness",
            6
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            8
          ],
          "destination": [
            "fractional",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "fractional",
            0
          ],
          "destination": [
            "harness",
            7
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "fractional",
            1
          ],
          "destination": [
            "harness",
            8
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            9
          ],
          "destination": [
            "intstore",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            10
          ],
          "destination": [
            "intstore",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "intstore",
            0
          ],
          "destination": [
            "harness",
            9
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            11
          ],
          "destination": [
            "floatstore",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "harness",
            12
          ],
          "destination": [
            "floatstore",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "floatstore",
            0
          ],
          "destination": [
            "harness",
            10
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "receiver_a",
            0
          ],
          "destination": [
            "harness",
            11
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "receiver_b",
            0
          ],
          "destination": [
            "harness",
            12
          ]
        }
      }
    ]
  }
}
