{
  "patcher": {
    "boxes": [
      {
        "box": {
          "id": "starter",
          "maxclass": "newobj",
          "patching_rect": [
            10,
            10,
            140,
            40
          ],
          "text": "js helpstarter.js append",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "saved_object_attributes": {
            "filename": "helpstarter.js",
            "parameter_enable": 0
          }
        }
      },
      {
        "box": {
          "id": "basic",
          "maxclass": "newobj",
          "patching_rect": [
            10,
            10,
            140,
            40
          ],
          "text": "p basic",
          "varname": "basic_tab",
          "patcher": {
            "boxes": [
              {
                "box": {
                  "id": "details",
                  "maxclass": "jsui",
                  "patching_rect": [
                    10,
                    10,
                    140,
                    40
                  ],
                  "filename": "helpdetails.js",
                  "border": 0,
                  "ignoreclick": 1,
                  "parameter_enable": 0,
                  "jsarguments": [
                    "append"
                  ],
                  "numinlets": 1,
                  "numoutlets": 1,
                  "outlettype": [
                    ""
                  ]
                }
              },
              {
                "box": {
                  "id": "args",
                  "maxclass": "jsui",
                  "patching_rect": [
                    10,
                    10,
                    140,
                    40
                  ],
                  "filename": "helpargs.js",
                  "border": 0,
                  "ignoreclick": 1,
                  "parameter_enable": 0,
                  "jsarguments": [
                    "append"
                  ],
                  "numinlets": 1,
                  "numoutlets": 1,
                  "outlettype": [
                    ""
                  ]
                }
              },
              {
                "box": {
                  "id": "message",
                  "maxclass": "message",
                  "patching_rect": [
                    10,
                    10,
                    140,
                    40
                  ],
                  "text": "17"
                }
              },
              {
                "box": {
                  "id": "print",
                  "maxclass": "newobj",
                  "patching_rect": [
                    10,
                    10,
                    140,
                    40
                  ],
                  "text": "print @popup 1"
                }
              }
            ],
            "lines": [
              {
                "patchline": {
                  "source": [
                    "message",
                    0
                  ],
                  "destination": [
                    "print",
                    0
                  ]
                }
              }
            ]
          }
        }
      },
      {
        "box": {
          "id": "name",
          "maxclass": "jsui",
          "patching_rect": [
            10,
            10,
            140,
            40
          ],
          "filename": "helpname.js",
          "border": 0,
          "ignoreclick": 1,
          "parameter_enable": 0,
          "jsarguments": [
            "append"
          ],
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ]
        }
      },
      {
        "box": {
          "id": "question",
          "maxclass": "newobj",
          "patching_rect": [
            10,
            10,
            140,
            40
          ],
          "text": "p ?",
          "varname": "q_tab",
          "patcher": {
            "boxes": [],
            "lines": []
          }
        }
      }
    ],
    "lines": []
  }
}
