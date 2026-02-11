(function(back) {
    const FILE = "minclock.json";

    const ci = require("clock_info");
    //const ci = require("https://raw.githubusercontent.com/espruino/BangleApps/refs/heads/master/apps/clock_info/lib.js");
    const s = require("Storage");
    const info = ci.load();

    var info_items = [];
    info.forEach((e) => {
        e.items.forEach((item) => info_items.push(item));
    });

    const launchCache = s.readJSON('launch.cache.json', true) || {};
    const launchApps = launchCache.apps || [];

    var defaultWidgetState = 0;
    var minWidgetState = 0;
    if (process.env.HWVERSION !== 2) {
        defaultWidgetState = 1;
        minWidgetState = 1;
    }

    var settings = Object.assign({
            widgetState: defaultWidgetState,
            showSeconds: true,
            clock_info: {
                tl: "temperature",
                to: "Min Date",
                tr: "wind",
                bl: "HRM",
                bt: "Battery",
                br: "Steps",
            },
            swipe: {
                left: "",
                right: "",
            },
        }, s.readJSON(FILE, true) || {});

    function writeSettings() { s.writeJSON(FILE, settings); }

    const WIDGET_STATE = ["Swipe", "Show", "Hide"];

    const BUILTIN_INFO = ["Empty","Min Date"];
    var CLOCK_INFO_CHOICES = [].concat(BUILTIN_INFO);
    info_items.forEach((v) => {
        if (v in BUILTIN_INFO) return;
        CLOCK_INFO_CHOICES.push(v.name);
    });

    const clock_info_naming = {
        tl: "top left",
        to: "top",
        tr: "top right",
        bl: "bottom left",
        bt: "bottom",
        br: "bottom right",
    };

    // Used to store clock_info index for the settings
    var clock_info_index = {
        tl: CLOCK_INFO_CHOICES.indexOf(settings.clock_info.tl) > -1 ? CLOCK_INFO_CHOICES.indexOf(settings.clock_info.tl) : 0,
        to: CLOCK_INFO_CHOICES.indexOf(settings.clock_info.to) > -1 ? CLOCK_INFO_CHOICES.indexOf(settings.clock_info.to) : 0,
        tr: CLOCK_INFO_CHOICES.indexOf(settings.clock_info.tr) > -1 ? CLOCK_INFO_CHOICES.indexOf(settings.clock_info.tr) : 0,
        bl: CLOCK_INFO_CHOICES.indexOf(settings.clock_info.bl) > -1 ? CLOCK_INFO_CHOICES.indexOf(settings.clock_info.bl) : 0,
        bt: CLOCK_INFO_CHOICES.indexOf(settings.clock_info.bt) > -1 ? CLOCK_INFO_CHOICES.indexOf(settings.clock_info.bt) : 0,
        br: CLOCK_INFO_CHOICES.indexOf(settings.clock_info.br) > -1 ? CLOCK_INFO_CHOICES.indexOf(settings.clock_info.br) : 0,
    };

    const APP_NAME_INDEX = ["None"];
    const APP_SRC_INDEX = [""];
    launchApps.forEach((e) => {
        APP_NAME_INDEX.push(e.name);
        APP_SRC_INDEX.push(e.src);
    });

    var app_index = {
        left: APP_SRC_INDEX.indexOf(settings.swipe.left) > -1 ? APP_SRC_INDEX.indexOf(settings.swipe.left) : 0,
        right: APP_SRC_INDEX.indexOf(settings.swipe.right) > -1 ? APP_SRC_INDEX.indexOf(settings.swipe.right) : 0,
    };

    var menu = {
        "": {"title": "Minimal Digital Clock"},
        "< Back": () => back(),

        'Widgets': {
            value: 0 | settings.widgetState % WIDGET_STATE.length,
            min: minWidgetState,
            max: WIDGET_STATE.length - 1,
            format: v => WIDGET_STATE[v],
            onchange: v => {
                settings.widgetState = v;
                writeSettings();
            },
        },
        'show seconds': {
            value: !!settings.showSeconds,
            onchange: v => {
                settings.showSeconds = v;
                writeSettings();
            }
        },
        "Clock Info": {
          onchange: v => E.showMenu(clock_info_menu),
        },

        "Swipe": {
          onchange: v => E.showMenu(swipe_menu),
        },
    };

    const clock_info_menu = {
        "": {"title": "Clock Info"},
        "< Back": () => E.showMenu(menu),
    };
    Object.keys(clock_info_index).forEach((k) => {
        clock_info_menu[clock_info_naming[k]] = {
            value: clock_info_index[k] % CLOCK_INFO_CHOICES.length,
            min: 0,
            max: CLOCK_INFO_CHOICES.length - 1,
            format: v => CLOCK_INFO_CHOICES[v],
            onchange: v => {
                clock_info_index[k] = v;
                settings.clock_info[k] = CLOCK_INFO_CHOICES[v];
                writeSettings();
            },
        };
    });

    const swipe_menu = {
        "": {"title": "Swipe"},
        "< Back": () => E.showMenu(menu),
    };

    Object.keys(settings.swipe).forEach((k) => {
        swipe_menu["swipe " + k] = {
            value: app_index[k] % APP_NAME_INDEX.length,
            min: 0,
            max: APP_NAME_INDEX.length - 1,
            format: v => APP_NAME_INDEX[v],
            onchange: v => {
                app_index[k] = v;
                settings.swipe[k] = APP_SRC_INDEX[v];
                writeSettings();
            },
        };
    });

    E.showMenu(menu);
})