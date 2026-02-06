{
    require("Font8x16").add(Graphics);

    const l = require("locale");
    const wu = require("widget_utils");
    const settings = require('Storage').readJSON("minclock.json", true) || {};
    const ci = require("clock_info");

    const info = ci.load();
    const info_items = [];
    info.forEach((e) => {
        e.items.forEach((item) => info_items.push(item));
    });

    const defaultWidgetState = process.env.HWVERSION!==2 ? 1: 0;

    const widgetState = settings.widgetState !== undefined ? settings.widgetState : defaultWidgetState;
    const timeFormat = settings.timeFormat !== undefined ? settings.timeFormat : 0; // system
    const showSeconds = settings.showSeconds !== undefined ? settings.showSeconds : true;
    const clock_info = settings.clock_info !== undefined ? settings.clock_info :
    {
        tl: "temperature",
        to: "Min Date",
        tr: "wind",
        bl: "Min HRM",
        bt: "Battery",
        br: "Steps",
    };

    const clock_info_draw = {
        tl: (x, y) => {},
        to: (x, y) => {},
        tr: (x, y) => {},
        bl: (x, y) => {},
        bt: (x, y) => {},
        br: (x, y) => {},
    };

    const builtin_info = {
        "Empty": (x, y) => {},

        "Min Date": (x, y) => {
            const month = date.getMonth()+1;
            const day = date.getDay()+1;

            g.drawString(month+"-"+day, x, y);
        },

        "Min HRM": (x, y) => {
            const hstatus = Bangle.getHealthStatus("day");
            if (hstatus && hstatus.bpm && hstatus.bpmConfidence > 75)
            {
                hrm = Math.round(hstatus.bpm);
                g.drawString(hrm, x, y);
                return;
            }

            g.drawString("--", x, y);
        }
    };

    Object.keys(clock_info).forEach((k) => {
        const info_key = clock_info[k];
        if (info_key.length == 0) return;

        if (info_key in builtin_info)
        {
            clock_info_draw[k] = builtin_info[info_key];
            return;
        }

        const item_index = info_items.findIndex((i) => { return i.name == info_key; });
        if (item_index >= 0)
        {
            const info_item = info_items[item_index];
            info_item.show();

            clock_info_draw[k] = (x, y) => {
                const text = info_item.get("text");
                g.drawString(text.short || text.text, x, y);
            };
            return;
        }

        //clock_info_draw[k] = (x, y) => g.drawString(info_key, x, y);
    });

    const c12h = l.is12Hours();
    const time_segments = (showSeconds ? 4: 3);
    const meridian_offset = (showSeconds ? 3.7 : 2.6);
    let date;

    let drawTimeout;
    let drawSecondsTimeout;

    let weatherTemp = "--";
    let weatherWind = "--";

    const drawSeconds = function() {
        if (!showSeconds)
        {
            if (drawSecondsTimeout) clearTimeout(drawSecondsTimeout);
            drawSecondsTimeout = undefined;
            return;
        }

        const tx = (g.getWidth() / 4) * 3;
        const ty = g.getHeight() / 2;

        date = new Date();
        const seconds = date.getSeconds().toString().padStart(2,0);
        const h = 16;
        const w = 20;
        g.reset()
            .setFontAlign(0,0)
            .setFont("Vector",h*2)
            .clearRect(tx-w, ty-h, tx+w, ty+h)
            .drawString(seconds, tx, ty);

        if (drawSecondsTimeout) clearTimeout(drawSecondsTimeout);
        drawSecondsTimeout = setTimeout(
            function()
            {
                drawSecondsTimeout = undefined;
                drawSeconds();
            },
        1000 - (Date.now() % 1000));
    };

    const draw = function() {
        const x = g.getWidth() / 4;
        const y = g.getHeight() / 4;
        const tx = g.getWidth() / time_segments;
        const ty = y*2;

        g.reset().clearRect(Bangle.appRect);
        const date = new Date();

        g.setFontAlign(0,0).setFont("Vector",32);

        {
            var h = date.getHours();
            if (c12h)
                h = (h % 12 == 0) ? 12 : h%12;
            g.drawString(h.toString().padStart(2,0), tx, ty);
        }

        {
            const minutes = date.getMinutes().toString().padStart(2,0);
            g.drawString(minutes, tx*2, ty);
        }

        if (showSeconds) drawSeconds();

        g.setFontAlign(0,0).setFont("8x16");

        if (c12h)
        {
            const ex = tx * meridian_offset;
            g.drawString(l.meridian(date, true), ex, ty+(14/2));
        }

        const hstatus = Bangle.getHealthStatus("day");

        {
            clock_info_draw.tl(x*1, y-8);
            clock_info_draw.to(x*2, y);
            clock_info_draw.tr(x*3, y-8);
        }

        {
            const ly = y*3;

            clock_info_draw.bl(x*1, ly+8);
            clock_info_draw.bt(x*2, ly);
            clock_info_draw.br(x*3, ly+8);
        }

        if (drawTimeout) clearTimeout(drawTimeout);
        drawTimeout = setTimeout(
            function()
            {
                drawTimeout = undefined;
                draw();
            },
        60000 - (Date.now() % 60000));
    };

    const clearAllTimeouts = function() {
        if (drawTimeout) clearTimeout(drawTimeout);
        drawTimeout = undefined;

        if (drawSecondsTimeout) clearTimeout(drawSecondsTimeout);
        drawSecondsTimeout = undefined;
    };

    const lcdPower = function(on){
        if (on) draw();
        else clearAllTimeouts();
    };

    // for better Bangle.JS 1 support
    Bangle.on('lcdPower', lcdPower);

    Bangle.setUI({
        mode : "clock",
        remove : function() {
            clearAllTimeouts();

            Bangle.removeListener('lcdPower', lcdPower);
            delete Graphics.prototype.setFont8x16;

            wu.show();
        },
        redraw: draw,
    });

    Bangle.loadWidgets();

    [
        // Swipe
        () => { wu.swipeOn(); },

        // Show
        () => { Bangle.drawWidgets(); },

        // Hide
        () => { wu.hide(); },
    ][widgetState]();
    draw();
}
