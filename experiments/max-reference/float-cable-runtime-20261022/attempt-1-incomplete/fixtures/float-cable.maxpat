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
      15,
      15,
      900,
      625
    ],
    "default_fontsize": 13.0,
    "default_fontname": "Arial",
    "bgcolor": [
      1,
      1,
      1,
      1
    ],
    "locked": 0,
    "boxes": [
      {
        "box": {
          "id": "label-zero",
          "varname": "label-zero",
          "maxclass": "comment",
          "patching_rect": [
            25,
            25,
            100,
            20
          ],
          "text": "zero"
        }
      },
      {
        "box": {
          "id": "zero",
          "varname": "zero",
          "maxclass": "flonum",
          "patching_rect": [
            25,
            50,
            54,
            23
          ],
          "format": 6,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "label-whole",
          "varname": "label-whole",
          "maxclass": "comment",
          "patching_rect": [
            130,
            25,
            100,
            20
          ],
          "text": "whole"
        }
      },
      {
        "box": {
          "id": "whole",
          "varname": "whole",
          "maxclass": "flonum",
          "patching_rect": [
            130,
            50,
            54,
            23
          ],
          "format": 6,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "label-half",
          "varname": "label-half",
          "maxclass": "comment",
          "patching_rect": [
            235,
            25,
            100,
            20
          ],
          "text": "half"
        }
      },
      {
        "box": {
          "id": "half",
          "varname": "half",
          "maxclass": "flonum",
          "patching_rect": [
            235,
            50,
            54,
            23
          ],
          "format": 6,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "label-negative",
          "varname": "label-negative",
          "maxclass": "comment",
          "patching_rect": [
            340,
            25,
            100,
            20
          ],
          "text": "negative"
        }
      },
      {
        "box": {
          "id": "negative",
          "varname": "negative",
          "maxclass": "flonum",
          "patching_rect": [
            340,
            50,
            54,
            23
          ],
          "format": 6,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "label-fraction",
          "varname": "label-fraction",
          "maxclass": "comment",
          "patching_rect": [
            445,
            25,
            100,
            20
          ],
          "text": "fraction"
        }
      },
      {
        "box": {
          "id": "fraction",
          "varname": "fraction",
          "maxclass": "flonum",
          "patching_rect": [
            445,
            50,
            54,
            23
          ],
          "format": 6,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "label-small",
          "varname": "label-small",
          "maxclass": "comment",
          "patching_rect": [
            550,
            25,
            100,
            20
          ],
          "text": "small"
        }
      },
      {
        "box": {
          "id": "small",
          "varname": "small",
          "maxclass": "flonum",
          "patching_rect": [
            550,
            50,
            54,
            23
          ],
          "format": 6,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "label-tinyneg",
          "varname": "label-tinyneg",
          "maxclass": "comment",
          "patching_rect": [
            655,
            25,
            100,
            20
          ],
          "text": "tinyneg"
        }
      },
      {
        "box": {
          "id": "tinyneg",
          "varname": "tinyneg",
          "maxclass": "flonum",
          "patching_rect": [
            655,
            50,
            54,
            23
          ],
          "format": 6,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "label-tiny",
          "varname": "label-tiny",
          "maxclass": "comment",
          "patching_rect": [
            760,
            25,
            100,
            20
          ],
          "text": "tiny"
        }
      },
      {
        "box": {
          "id": "tiny",
          "varname": "tiny",
          "maxclass": "flonum",
          "patching_rect": [
            760,
            50,
            54,
            23
          ],
          "format": 6,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "arithmetic-label",
          "varname": "arithmetic-label",
          "maxclass": "comment",
          "patching_rect": [
            25,
            110,
            450,
            20
          ],
          "text": "Original scalar multiplication receipts: direct and after flonum"
        }
      },
      {
        "box": {
          "id": "multiply",
          "varname": "multiply",
          "maxclass": "newobj",
          "patching_rect": [
            25,
            140,
            54,
            23
          ],
          "text": "* 0.5",
          "numinlets": 2,
          "numoutlets": 1
        }
      },
      {
        "box": {
          "id": "after",
          "varname": "after",
          "maxclass": "flonum",
          "patching_rect": [
            150,
            140,
            54,
            23
          ],
          "format": 6,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "entry-label",
          "varname": "entry-label",
          "maxclass": "comment",
          "patching_rect": [
            310,
            110,
            270,
            20
          ],
          "text": "Physical number entry / blur / Tab / drag"
        }
      },
      {
        "box": {
          "id": "entry",
          "varname": "entry",
          "maxclass": "flonum",
          "patching_rect": [
            310,
            140,
            54,
            23
          ],
          "format": 6,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "next-entry",
          "varname": "next-entry",
          "maxclass": "flonum",
          "patching_rect": [
            420,
            140,
            54,
            23
          ],
          "format": 6,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "route-label-0",
          "varname": "route-label-0",
          "maxclass": "comment",
          "patching_rect": [
            40,
            270,
            180,
            20
          ],
          "text": "one point"
        }
      },
      {
        "box": {
          "id": "source0",
          "varname": "source0",
          "maxclass": "button",
          "patching_rect": [
            40,
            310,
            24,
            24
          ],
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "sink0",
          "varname": "sink0",
          "maxclass": "number",
          "patching_rect": [
            140,
            490,
            54,
            23
          ],
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "route-label-1",
          "varname": "route-label-1",
          "maxclass": "comment",
          "patching_rect": [
            240,
            270,
            180,
            20
          ],
          "text": "two points"
        }
      },
      {
        "box": {
          "id": "source1",
          "varname": "source1",
          "maxclass": "button",
          "patching_rect": [
            240,
            310,
            24,
            24
          ],
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "sink1",
          "varname": "sink1",
          "maxclass": "number",
          "patching_rect": [
            340,
            490,
            54,
            23
          ],
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "route-label-2",
          "varname": "route-label-2",
          "maxclass": "comment",
          "patching_rect": [
            440,
            270,
            180,
            20
          ],
          "text": "four points"
        }
      },
      {
        "box": {
          "id": "source2",
          "varname": "source2",
          "maxclass": "button",
          "patching_rect": [
            440,
            310,
            24,
            24
          ],
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "sink2",
          "varname": "sink2",
          "maxclass": "number",
          "patching_rect": [
            540,
            490,
            54,
            23
          ],
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "route-label-3",
          "varname": "route-label-3",
          "maxclass": "comment",
          "patching_rect": [
            640,
            270,
            180,
            20
          ],
          "text": "repeated point"
        }
      },
      {
        "box": {
          "id": "source3",
          "varname": "source3",
          "maxclass": "button",
          "patching_rect": [
            640,
            310,
            24,
            24
          ],
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "sink3",
          "varname": "sink3",
          "maxclass": "number",
          "patching_rect": [
            740,
            490,
            54,
            23
          ],
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "probe",
          "varname": "probe",
          "maxclass": "newobj",
          "patching_rect": [
            25,
            565,
            100,
            22
          ],
          "text": "js probe.js",
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
            "zero",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "zero",
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
            1
          ],
          "destination": [
            "whole",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "whole",
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
            2
          ],
          "destination": [
            "half",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "half",
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
            3
          ],
          "destination": [
            "negative",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "negative",
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
            4
          ],
          "destination": [
            "fraction",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "fraction",
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
            5
          ],
          "destination": [
            "small",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "small",
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
            6
          ],
          "destination": [
            "tinyneg",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "tinyneg",
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
            7
          ],
          "destination": [
            "tiny",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "tiny",
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
            10
          ],
          "destination": [
            "multiply",
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
            "multiply",
            1
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "multiply",
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
            "multiply",
            0
          ],
          "destination": [
            "after",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "after",
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
            12
          ],
          "destination": [
            "entry",
            0
          ],
          "hidden": 1
        }
      },
      {
        "patchline": {
          "source": [
            "entry",
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
            "next-entry",
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
            "source0",
            0
          ],
          "destination": [
            "sink0",
            0
          ],
          "midpoints": [
            51.5,
            400
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "source1",
            0
          ],
          "destination": [
            "sink1",
            0
          ],
          "midpoints": [
            251.5,
            380,
            371.5,
            380
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "source2",
            0
          ],
          "destination": [
            "sink2",
            0
          ],
          "midpoints": [
            451.5,
            360,
            500,
            360,
            500,
            445,
            571.5,
            445
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "source3",
            0
          ],
          "destination": [
            "sink3",
            0
          ],
          "midpoints": [
            651.5,
            400,
            651.5,
            400
          ]
        }
      }
    ]
  }
}
