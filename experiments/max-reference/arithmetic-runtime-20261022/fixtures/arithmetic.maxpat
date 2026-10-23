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
      10,
      10,
      900,
      450
    ],
    "locked": 1,
    "boxes": [
      {
        "box": {
          "id": "op0-bare",
          "varname": "op0-bare",
          "maxclass": "newobj",
          "text": "+",
          "patching_rect": [
            20,
            30,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op0-integer",
          "varname": "op0-integer",
          "maxclass": "newobj",
          "text": "+ 2",
          "patching_rect": [
            120,
            30,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op0-float",
          "varname": "op0-float",
          "maxclass": "newobj",
          "text": "+ 2.",
          "patching_rect": [
            220,
            30,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op1-bare",
          "varname": "op1-bare",
          "maxclass": "newobj",
          "text": "*",
          "patching_rect": [
            320,
            30,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op1-integer",
          "varname": "op1-integer",
          "maxclass": "newobj",
          "text": "* 2",
          "patching_rect": [
            420,
            30,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op1-float",
          "varname": "op1-float",
          "maxclass": "newobj",
          "text": "* 2.",
          "patching_rect": [
            520,
            30,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op2-bare",
          "varname": "op2-bare",
          "maxclass": "newobj",
          "text": "-",
          "patching_rect": [
            620,
            30,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op2-integer",
          "varname": "op2-integer",
          "maxclass": "newobj",
          "text": "- 2",
          "patching_rect": [
            720,
            30,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op2-float",
          "varname": "op2-float",
          "maxclass": "newobj",
          "text": "- 2.",
          "patching_rect": [
            20,
            100,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op3-bare",
          "varname": "op3-bare",
          "maxclass": "newobj",
          "text": "/",
          "patching_rect": [
            120,
            100,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op3-integer",
          "varname": "op3-integer",
          "maxclass": "newobj",
          "text": "/ 2",
          "patching_rect": [
            220,
            100,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op3-float",
          "varname": "op3-float",
          "maxclass": "newobj",
          "text": "/ 2.",
          "patching_rect": [
            320,
            100,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op4-bare",
          "varname": "op4-bare",
          "maxclass": "newobj",
          "text": "%",
          "patching_rect": [
            420,
            100,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op4-integer",
          "varname": "op4-integer",
          "maxclass": "newobj",
          "text": "% 2",
          "patching_rect": [
            520,
            100,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op4-float",
          "varname": "op4-float",
          "maxclass": "newobj",
          "text": "% 2.",
          "patching_rect": [
            620,
            100,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op5-bare",
          "varname": "op5-bare",
          "maxclass": "newobj",
          "text": "!-",
          "patching_rect": [
            720,
            100,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op5-integer",
          "varname": "op5-integer",
          "maxclass": "newobj",
          "text": "!- 2",
          "patching_rect": [
            20,
            170,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op5-float",
          "varname": "op5-float",
          "maxclass": "newobj",
          "text": "!- 2.",
          "patching_rect": [
            120,
            170,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op6-bare",
          "varname": "op6-bare",
          "maxclass": "newobj",
          "text": "!/",
          "patching_rect": [
            220,
            170,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op6-integer",
          "varname": "op6-integer",
          "maxclass": "newobj",
          "text": "!/ 2",
          "patching_rect": [
            320,
            170,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op6-float",
          "varname": "op6-float",
          "maxclass": "newobj",
          "text": "!/ 2.",
          "patching_rect": [
            420,
            170,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op7-bare",
          "varname": "op7-bare",
          "maxclass": "newobj",
          "text": "abs",
          "patching_rect": [
            520,
            170,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op7-integer",
          "varname": "op7-integer",
          "maxclass": "newobj",
          "text": "abs 2",
          "patching_rect": [
            620,
            170,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op7-float",
          "varname": "op7-float",
          "maxclass": "newobj",
          "text": "abs 2.",
          "patching_rect": [
            720,
            170,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op0-extra24",
          "varname": "op0-extra24",
          "maxclass": "newobj",
          "text": "+ 2e0",
          "patching_rect": [
            20,
            240,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op1-extra25",
          "varname": "op1-extra25",
          "maxclass": "newobj",
          "text": "* 0.5",
          "patching_rect": [
            120,
            240,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op3-extra26",
          "varname": "op3-extra26",
          "maxclass": "newobj",
          "text": "/ 2e0",
          "patching_rect": [
            220,
            240,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op4-extra27",
          "varname": "op4-extra27",
          "maxclass": "newobj",
          "text": "% 0.5",
          "patching_rect": [
            320,
            240,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op4-extra28",
          "varname": "op4-extra28",
          "maxclass": "newobj",
          "text": "% 2.5",
          "patching_rect": [
            420,
            240,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op7-extra29",
          "varname": "op7-extra29",
          "maxclass": "newobj",
          "text": "abs 2e0",
          "patching_rect": [
            520,
            240,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "op7-extra30",
          "varname": "op7-extra30",
          "maxclass": "newobj",
          "text": "abs 0.5",
          "patching_rect": [
            620,
            240,
            85,
            22
          ]
        }
      },
      {
        "box": {
          "id": "probe",
          "varname": "probe",
          "maxclass": "newobj",
          "text": "js probe.js",
          "patching_rect": [
            20,
            350,
            150,
            22
          ],
          "hidden": 1
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "probe",
            0
          ],
          "destination": [
            "op0-bare",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            1
          ],
          "destination": [
            "op0-bare",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op0-bare",
            0
          ],
          "destination": [
            "probe",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            2
          ],
          "destination": [
            "op0-integer",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            3
          ],
          "destination": [
            "op0-integer",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op0-integer",
            0
          ],
          "destination": [
            "probe",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            4
          ],
          "destination": [
            "op0-float",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            5
          ],
          "destination": [
            "op0-float",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op0-float",
            0
          ],
          "destination": [
            "probe",
            2
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            6
          ],
          "destination": [
            "op1-bare",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            7
          ],
          "destination": [
            "op1-bare",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op1-bare",
            0
          ],
          "destination": [
            "probe",
            3
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            8
          ],
          "destination": [
            "op1-integer",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            9
          ],
          "destination": [
            "op1-integer",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op1-integer",
            0
          ],
          "destination": [
            "probe",
            4
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            10
          ],
          "destination": [
            "op1-float",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            11
          ],
          "destination": [
            "op1-float",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op1-float",
            0
          ],
          "destination": [
            "probe",
            5
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            12
          ],
          "destination": [
            "op2-bare",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            13
          ],
          "destination": [
            "op2-bare",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op2-bare",
            0
          ],
          "destination": [
            "probe",
            6
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            14
          ],
          "destination": [
            "op2-integer",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            15
          ],
          "destination": [
            "op2-integer",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op2-integer",
            0
          ],
          "destination": [
            "probe",
            7
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            16
          ],
          "destination": [
            "op2-float",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            17
          ],
          "destination": [
            "op2-float",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op2-float",
            0
          ],
          "destination": [
            "probe",
            8
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            18
          ],
          "destination": [
            "op3-bare",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            19
          ],
          "destination": [
            "op3-bare",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op3-bare",
            0
          ],
          "destination": [
            "probe",
            9
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            20
          ],
          "destination": [
            "op3-integer",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            21
          ],
          "destination": [
            "op3-integer",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op3-integer",
            0
          ],
          "destination": [
            "probe",
            10
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            22
          ],
          "destination": [
            "op3-float",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            23
          ],
          "destination": [
            "op3-float",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op3-float",
            0
          ],
          "destination": [
            "probe",
            11
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            24
          ],
          "destination": [
            "op4-bare",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            25
          ],
          "destination": [
            "op4-bare",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op4-bare",
            0
          ],
          "destination": [
            "probe",
            12
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            26
          ],
          "destination": [
            "op4-integer",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            27
          ],
          "destination": [
            "op4-integer",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op4-integer",
            0
          ],
          "destination": [
            "probe",
            13
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            28
          ],
          "destination": [
            "op4-float",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            29
          ],
          "destination": [
            "op4-float",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op4-float",
            0
          ],
          "destination": [
            "probe",
            14
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            30
          ],
          "destination": [
            "op5-bare",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            31
          ],
          "destination": [
            "op5-bare",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op5-bare",
            0
          ],
          "destination": [
            "probe",
            15
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            32
          ],
          "destination": [
            "op5-integer",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            33
          ],
          "destination": [
            "op5-integer",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op5-integer",
            0
          ],
          "destination": [
            "probe",
            16
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            34
          ],
          "destination": [
            "op5-float",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            35
          ],
          "destination": [
            "op5-float",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op5-float",
            0
          ],
          "destination": [
            "probe",
            17
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            36
          ],
          "destination": [
            "op6-bare",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            37
          ],
          "destination": [
            "op6-bare",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op6-bare",
            0
          ],
          "destination": [
            "probe",
            18
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            38
          ],
          "destination": [
            "op6-integer",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            39
          ],
          "destination": [
            "op6-integer",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op6-integer",
            0
          ],
          "destination": [
            "probe",
            19
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            40
          ],
          "destination": [
            "op6-float",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            41
          ],
          "destination": [
            "op6-float",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op6-float",
            0
          ],
          "destination": [
            "probe",
            20
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            42
          ],
          "destination": [
            "op7-bare",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op7-bare",
            0
          ],
          "destination": [
            "probe",
            21
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            44
          ],
          "destination": [
            "op7-integer",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op7-integer",
            0
          ],
          "destination": [
            "probe",
            22
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            46
          ],
          "destination": [
            "op7-float",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op7-float",
            0
          ],
          "destination": [
            "probe",
            23
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            48
          ],
          "destination": [
            "op0-extra24",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            49
          ],
          "destination": [
            "op0-extra24",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op0-extra24",
            0
          ],
          "destination": [
            "probe",
            24
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            50
          ],
          "destination": [
            "op1-extra25",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            51
          ],
          "destination": [
            "op1-extra25",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op1-extra25",
            0
          ],
          "destination": [
            "probe",
            25
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            52
          ],
          "destination": [
            "op3-extra26",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            53
          ],
          "destination": [
            "op3-extra26",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op3-extra26",
            0
          ],
          "destination": [
            "probe",
            26
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            54
          ],
          "destination": [
            "op4-extra27",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            55
          ],
          "destination": [
            "op4-extra27",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op4-extra27",
            0
          ],
          "destination": [
            "probe",
            27
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            56
          ],
          "destination": [
            "op4-extra28",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            57
          ],
          "destination": [
            "op4-extra28",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op4-extra28",
            0
          ],
          "destination": [
            "probe",
            28
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            58
          ],
          "destination": [
            "op7-extra29",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op7-extra29",
            0
          ],
          "destination": [
            "probe",
            29
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            60
          ],
          "destination": [
            "op7-extra30",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "op7-extra30",
            0
          ],
          "destination": [
            "probe",
            30
          ],
          "hidden": 1
        }
      }
    ]
  }
}
