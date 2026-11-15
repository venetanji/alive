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
      100,
      100,
      780,
      570
    ],
    "openinpresentation": 0,
    "default_fontsize": 16,
    "default_fontname": "Arial",
    "boxes": [
      {
        "box": {
          "id": "header",
          "maxclass": "comment",
          "patching_rect": [
            20,
            10,
            660,
            28
          ],
          "text": "ROOT HEADER: this belongs to root canvas only"
        }
      },
      {
        "box": {
          "id": "zeta",
          "maxclass": "newobj",
          "patching_rect": [
            450,
            260,
            90,
            25
          ],
          "text": "p Zeta",
          "varname": "zeta",
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
              100,
              100,
              780,
              570
            ],
            "openinpresentation": 0,
            "default_fontsize": 16,
            "default_fontname": "Arial",
            "boxes": [
              {
                "box": {
                  "id": "title",
                  "maxclass": "comment",
                  "patching_rect": [
                    20,
                    90,
                    660,
                    28
                  ],
                  "text": "ZETA CONTENT: root header should be independently identifiable"
                }
              },
              {
                "box": {
                  "id": "value",
                  "maxclass": "number",
                  "patching_rect": [
                    20,
                    140,
                    90,
                    28
                  ],
                  "varname": "value",
                  "parameter_enable": 0
                }
              },
              {
                "box": {
                  "id": "local",
                  "maxclass": "newobj",
                  "patching_rect": [
                    330,
                    250,
                    100,
                    25
                  ],
                  "text": "p Local",
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
                      100,
                      100,
                      780,
                      570
                    ],
                    "openinpresentation": 0,
                    "default_fontsize": 16,
                    "default_fontname": "Arial",
                    "boxes": [
                      {
                        "box": {
                          "id": "title",
                          "maxclass": "comment",
                          "patching_rect": [
                            20,
                            90,
                            660,
                            28
                          ],
                          "text": "LOCAL TAB: showontab 1 inside Zeta"
                        }
                      }
                    ],
                    "lines": [],
                    "showontab": 1
                  },
                  "varname": "local"
                }
              },
              {
                "box": {
                  "id": "promoted",
                  "maxclass": "newobj",
                  "patching_rect": [
                    200,
                    290,
                    120,
                    25
                  ],
                  "text": "p Promoted",
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
                      100,
                      100,
                      780,
                      570
                    ],
                    "openinpresentation": 0,
                    "default_fontsize": 16,
                    "default_fontname": "Arial",
                    "boxes": [
                      {
                        "box": {
                          "id": "title",
                          "maxclass": "comment",
                          "patching_rect": [
                            20,
                            90,
                            660,
                            28
                          ],
                          "text": "PROMOTED TAB: showontab 2 inside Zeta"
                        }
                      }
                    ],
                    "lines": [],
                    "showontab": 2
                  },
                  "varname": "promoted"
                }
              },
              {
                "box": {
                  "id": "hidden",
                  "maxclass": "newobj",
                  "patching_rect": [
                    20,
                    330,
                    120,
                    25
                  ],
                  "text": "p Hidden",
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
                      100,
                      100,
                      780,
                      570
                    ],
                    "openinpresentation": 0,
                    "default_fontsize": 16,
                    "default_fontname": "Arial",
                    "boxes": [
                      {
                        "box": {
                          "id": "title",
                          "maxclass": "comment",
                          "patching_rect": [
                            20,
                            90,
                            660,
                            28
                          ],
                          "text": "HIDDEN CHILD: showontab 0"
                        }
                      }
                    ],
                    "lines": [],
                    "showontab": 0
                  }
                }
              },
              {
                "box": {
                  "id": "this",
                  "maxclass": "newobj",
                  "patching_rect": [
                    20,
                    410,
                    100,
                    25
                  ],
                  "text": "thispatcher",
                  "varname": "this"
                }
              }
            ],
            "lines": [],
            "showontab": 1,
            "showrootpatcherontab": 1
          }
        }
      },
      {
        "box": {
          "id": "alpha",
          "maxclass": "newobj",
          "patching_rect": [
            20,
            100,
            90,
            25
          ],
          "text": "p Alpha",
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
              100,
              100,
              780,
              570
            ],
            "openinpresentation": 0,
            "default_fontsize": 16,
            "default_fontname": "Arial",
            "boxes": [
              {
                "box": {
                  "id": "title",
                  "maxclass": "comment",
                  "patching_rect": [
                    20,
                    90,
                    660,
                    28
                  ],
                  "text": "ALPHA CONTENT: second saved root tab"
                }
              }
            ],
            "lines": [],
            "showontab": 1
          }
        }
      },
      {
        "box": {
          "id": "probe",
          "maxclass": "newobj",
          "patching_rect": [
            20,
            430,
            260,
            25
          ],
          "text": "js probe-isolated.js isolated-root-shown"
        }
      },
      {
        "box": {
          "id": "this",
          "maxclass": "newobj",
          "patching_rect": [
            20,
            475,
            100,
            25
          ],
          "text": "thispatcher",
          "varname": "this"
        }
      },
      {
        "box": {
          "id": "pcontrol",
          "maxclass": "newobj",
          "patching_rect": [
            350,
            475,
            90,
            25
          ],
          "text": "pcontrol"
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
            "this",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "probe",
            1
          ],
          "destination": [
            "pcontrol",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "pcontrol",
            0
          ],
          "destination": [
            "zeta",
            0
          ]
        }
      }
    ],
    "showrootpatcherontab": 1,
    "showontab": 0,
    "bglocked": 1
  }
}
