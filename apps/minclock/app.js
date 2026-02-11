{
    g.clearRect(0, 0, g.getWidth()-1, g.getHeight());
    // g.fillRect(Bangle.appRect);

    require("Font8x16").add(Graphics);

    const l = require("locale");
    const wu = require("widget_utils");
    const settings = require('Storage').readJSON("minclock.json", true) || {};
    const ci = require("clock_info");
    //const ci = require("https://raw.githubusercontent.com/espruino/BangleApps/refs/heads/master/apps/clock_info/lib.js");

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
        bl: "HRM",
        bt: "Battery",
        br: "Steps",
    };
    const swipe = settings.swipe !== undefined ? settings.swipe :
    {
        left: "",
        right: "",
    };

    const c12h = l.is12Hours();
    const time_segments = (showSeconds ? 4: 3);
    const meridian_offset = (showSeconds ? 3.7 : 2.6);
    let date;

    let drawTimeout;
    let drawSecondsTimeout;

    const x = g.getWidth() / 4;
    const y = g.getHeight() / 4;
    const tx = g.getWidth() / time_segments;
    const ty = y*2;
    const ly = y*3;
    const sx = tx * 3;

    const clock_info_items = {
        tl: { x: x  , y: y-8,  item: undefined },
        to: { x: x*2, y: y,    item: undefined },
        tr: { x: x*3, y: y-8,  item: undefined },
        bl: { x: x  , y: ly+8, item: undefined },
        bt: { x: x*2, y: ly,   item: undefined },
        br: { x: x*3, y: ly+8, item: undefined },
    };

    const builtin_info = [
        {
            name: "Min Date",
            hasRange: false,
            get: () => {
                date = new Date();
                const month = date.getMonth()+1;
                const day = date.getDate();

                return { short: month+"-"+day, text: undefined };
            },
            show: function() {
                this.dateInfoTimeout = setTimeout(
                    () => this.emit("redraw"),
                    86400000  - (Date.now() % 86400000)
                );
                this.emit("redraw");
            },
            hide: function() {
                if (this.dateInfoTimeout)
                {
                    clearTimeout(this.dateInfoTimeout);
                    this.dateInfoTimeout = undefined;
                }
            },
        },
    ];

    Object.keys(clock_info).forEach((k) => {
        const info_key = clock_info[k];
        if (info_key.length == 0) return;
        let info_item;

        {
            const item_index = info_items.findIndex((i) => { return i.name == info_key; });
            const builtin_index = builtin_info.findIndex((i) => { return i.name == info_key; });
            if (item_index >= 0)
                info_item = info_items[item_index];
            else if (builtin_index >= 0)
                info_item = builtin_info[builtin_index];

            if (!info_item)
                return;
        }
        clock_info_items[k].item = info_item;

        const drawInfo = () => {
            const x = clock_info_items[k].x;
            const y = clock_info_items[k].y;

            g.reset()
                .setFontAlign(0,0)
                .setFont("8x16");

            const text = info_item.get("text");
            const str = (
                info_item.hasRange ?
                    (isNaN(text.v) ? "--" : text.v.toString()) : null)
                    || text.short || text.text || "--";
            const h = 8;
            const w = g.stringWidth(str+"---") / 2;

            g.clearRect(x-w, y-h, x+w, y+h)
                .drawString(str, x, y);
        };

        info_item.on("redraw", drawInfo);
        info_item.show();
        drawInfo(); // redraw manually to prevent any pop-in
    });

    const drawSeconds = function() {
        if (!showSeconds)
        {
            if (drawSecondsTimeout) clearTimeout(drawSecondsTimeout);
            drawSecondsTimeout = undefined;
            return;
        }

        date = new Date();
        const seconds = date.getSeconds().toString().padStart(2,0);
        const h = 16;
        const w = 20;
        g.reset()
            .setFontAlign(0,0)
            .setFont("Vector",h*2)
            .clearRect(sx-w, ty-h, sx+w, ty+h)
            .drawString(seconds, sx, ty);

        if (drawSecondsTimeout) clearTimeout(drawSecondsTimeout);
        drawSecondsTimeout = setTimeout(() => {
                drawSecondsTimeout = undefined;
                drawSeconds();
            },
        1000 - (Date.now() % 1000));
    };

    const draw = function() {
        const w = 22;
        const h = 16;
        g.reset().clearRect(tx - w, ty - h, (tx*2) + w, ty + h);
        date = new Date();

        g.setFontAlign(0,0).setFont("Vector", h*2);

        {
            let hour = date.getHours();
            if (c12h)
                hour = (hour % 12 == 0) ? 12 : h%12;
            g.drawString(hour.toString().padStart(2,0), tx, ty);
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

    const lcdPower = (on) => {
        if (on) draw();
        else clearAllTimeouts();
    };

    // for better Bangle.JS 1 support
    Bangle.on("lcdPower", lcdPower);

    const onSwipe = (lr, ud) => {
        if (ud) return;

        const src = (lr > 0 ? swipe.right : swipe.left) || "";
        if (!src.length) return;
        load(src);
    };

    Bangle.on("swipe", onSwipe);

    Bangle.setUI({
        mode : "clock",
        remove : function() {
            clearAllTimeouts();

            Bangle.removeListener("lcdPower", lcdPower);
            Bangle.removeListener("swipe", onSwipe);
            delete Graphics.prototype.setFont8x16;

            Object.keys(clock_info_items).forEach((k) => clock_info_items[k].item.hide());

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
