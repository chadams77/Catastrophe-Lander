var GAME = GAME || {};

// Automatically resizes game area to full screen
// functions PX and PY convert world units to game units
// Where GH (game height) is always 100, and GW (game width) is always 100 * the aspect ratio

GAME.Init = function ( )
{
    GAME.W = $(window).width();
    GAME.H = $(window).height();

    var setBuffer = function ( )
    {
        if (GAME.bfrImg)
        {
            GAME.bfrImg.parent.removeChild(GAME.bfrImg);
            GAME.bfrImg.kill();
        }

        GAME.bfr = GAME.game.make.bitmapData(GAME.W, GAME.H);
        GAME.bfrImg = GAME.bfr.addToWorld(0, 0);

        GAME.GW = 100 * (GAME.W/GAME.H);
        GAME.GH = 100;
    };

    var game = GAME.game = new Phaser.Game(GAME.W, GAME.H, Phaser.AUTO, '', {
        preload: function () {

            game.load.image('star', 'img/star.png');
            game.load.image('p1-on', 'img/p1-on.png');
            game.load.image('p1-off', 'img/p1-off.png');
            game.load.image('p2-on', 'img/p2-on.png');
            game.load.image('p2-off', 'img/p2-off.png');

        },
        create: function () {

            setBuffer();

        },
        update: GAME.Update
    });

    $(window).resize(function(){
        GAME.W = $(window).width();
        GAME.H = $(window).height();
        game.width = GAME.W;
        game.height = GAME.H;
        game.renderer.resize(GAME.W, GAME.H);
        setBuffer();
    });

};

// Convert world coords to screen
var PX = function ( x )
{
    return (x/GAME.GW) * GAME.W;
};

var PY = function ( y )
{
    return (y/GAME.GH) * GAME.H;
};

// sz: Units on screen
// isz: Original size of image in pixels
var PSCALE = function ( sz, isz )
{
    return PY(sz) / isz;
};

// Returns the time elapsed in seconds since the game started
// Pauses if window loses context
var __ctime = 0.0;
var ctime = function ( )
{
    return __ctime;
};

var LAND_HEIGHT = 50;
var LAND_HMIN   = 2;

var LAND = null;
var LZONE = [];

var STARS = [];
var DCD = 2.0;

var initStage = function ( )
{
    var ST = 184;
    var H = [];

    var seed = GAME.game.time.now / 1000.0;

    for (var i=0; i<ST; i++)
    {
        var L1 = Math.floor(i / 16);
        var L2 = Math.floor(i / 8);
        var L3 = Math.floor(i / 4);
        var L4 = Math.floor(i / 2);
        var L5 = i;

        var h = 0;
        Math.seedrandom(seed+L1); h += Math.random() * 0.5;
        Math.seedrandom(seed+L2); h += Math.random() * 0.25;
        Math.seedrandom(seed+L3); h += Math.random() * 0.125;
        Math.seedrandom(seed+L4); h += Math.random() * 0.125/2.0;
        Math.seedrandom(seed+L5); h += Math.random() * 0.125/4.0;

        H.push(GAME.GH - (h * (LAND_HEIGHT - LAND_HMIN) + LAND_HMIN));
    }

    Math.seedrandom(seed+1337);
    LZONE = [];
    if (Math.random() < 0.5)
        LZONE.push(
            Math.floor(Math.random() * ST / 2.5 + ST / 6),
            Math.floor(Math.random() * ST / 2.5 + ST / 2)
        );
    else
        LZONE.push(
            Math.floor(Math.random() * ST / 4 - ST / 8 + ST / 2)
        );

    var LR = Math.floor(ST/32);
    for (var i=0; i<LZONE.length; i++)
    {
        var ah = 0.0;
        for (var j=LZONE[i]-LR; j<=LZONE[i]+LR; j++)
            if (j>=0 && j<ST)
                ah += H[j];
        ah /= LR*2+1;
        for (var j=LZONE[i]-LR; j<=LZONE[i]+LR; j++)
            if (j>=0 && j<ST)
                H[j] = ah;
    }

    STARS = [];
    for (var i=0; i<250; i++)
    {
        var st = {
            x: Math.random() * GAME.GW,
            y: Math.random() * GAME.GH,
            sz: Math.pow(Math.max(0.35, Math.random()), 3.0) * 2.5
        };
        STARS.push(st);
    }

    STARS.sort(function(a,b){
        return a.sz - b.sz;
    });

    LAND = H;

    SHIP = [];

    SHIP.push({
        x: LX(ST*0.25+ST*0.5),
        y: 8,
        xv: 0.0,
        yv: 0.0,
        a: 0.0,
        av: 0.0,
        alive: true,
        left: Phaser.Keyboard.LEFT,
        right: Phaser.Keyboard.RIGHT,
        up: Phaser.Keyboard.UP
    });

    SHIP.push({
        x: LX(ST*0.25),
        y: 8,
        xv: 0.0,
        yv: 0.0,
        a: 0.0,
        av: 0.0,
        alive: true,
        left: Phaser.Keyboard.A,
        right: Phaser.Keyboard.D,
        up: Phaser.Keyboard.W
    });

    DCD = null;
};

var LX = function ( i )
{
    return ((i / LAND.length) * 160.0 - 80.0 + GAME.GW/2.0);
};

var collideLand = function ( x, y, r )
{
    var ILX = function ( _x )
    {
        var i = Math.floor(((_x - GAME.GW/2.0 + 80) / 160) * LAND.length);
        return i;
    };

    var i0 = ILX(x-r), i1 = ILX(x), i2 = ILX(x+r);
    var i1f = ((x - GAME.GW/2.0 + 80) / 160) * LAND.length;

    var h0 = i0 >= 0 && i0 < LAND.length ? LAND[i0] : 100;
    var h1 = i1 >= 0 && i1 < LAND.length ? LAND[i1] : 100;
    var h2 = i2 >= 0 && i2 < LAND.length ? LAND[i2] : 100;

    if (y >= h0 || (y+r) >= h1 || y >= h2)
    {
        for (var i=0; i<LZONE.length; i++)
            if (Math.abs(LZONE[i] - i1f) < 5)
                return 1;
        return 2;
    }
    return 0;
}; 

var SHIP = null;
var SSZ  = 10;
var PNT  = [ 0, 0 ];

GAME.Update = function ( )
{
    // Update timer
    var delta = 1.0/60.0;
    var newTime = GAME.game.time.now / 1000.0;
    if (GAME.lastFrameTime)
        delta = newTime - GAME.lastFrameTime;
    GAME.lastFrameTime = newTime;
    if (delta > 1/10) delta = 1/10;
    __ctime += delta;

    // Clear screen
    GAME.bfr.ctx.fillStyle = 'black';
    GAME.bfr.ctx.fillRect(0, 0, GAME.W, GAME.H);

    var ctx = GAME.bfr.ctx;

    if (!LAND || (DCD !== null && DCD < 0.0))
    {
        if (PNT[0] >= 10 || PNT[1] >= 10)
        {
            var win = PNT[0] > PNT[1];
            ctx.save();
            ctx.font = "" + Math.floor(PY(8)) + "px Impact";
            ctx.textAlign = 'center';
            ctx.fillStyle = win ? 'rgba(64, 255, 255, 1)' : 'rgba(255, 255, 64, 1)';
            ctx.fillText(win ? 'GREEN WINS. EZPZ.' : 'YELLOW WINS. GET REKT.', PX(GAME.GW/2), PY(50-4));
            ctx.restore();
        }
        else
            initStage();
    }

    var spr = GAME.game.make.sprite(0, 0, 'star');
    spr.anchor.set(0.5);

    for (var i=0; i<STARS.length; i++)
    {
        spr.alpha = 0.6 * STARS[i].sz * (Math.sin(ctime()*((i%3)+1)+i*454.123) * 0.4+0.6);
        spr.scale.set(PSCALE(STARS[i].sz, 32.0));
        GAME.bfr.draw(spr, PX(STARS[i].x), PY(STARS[i].y));
    }

    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = 'rgba(128,128,128,1)';
    ctx.strokeStyle = 'rgba(92,92,92,1)';
    ctx.lineWidth = 3.0;
    ctx.moveTo(PX(LX(-1)), PY(100));
    for (var i=0; i<LAND.length; i++)
    {
        var x = PX(LX(i));
        var y = PY(LAND[i]);
        ctx.lineTo(x, y);
    }
    ctx.lineTo(PX(LX(LAND.length)), PY(100));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    var LR = Math.floor(LAND.length/32);
    ctx.strokeStyle = 'rgba(0,192,0,1)';
    for (var j=0; j<LAND.length; j++)
    {
        var i1 = Math.max(0, LZONE[j]-LR);
        var i2 = Math.min(LAND.length-1, LZONE[j]+LR);
        ctx.beginPath();
        ctx.moveTo(PX(LX(i1)), PY(LAND[i1]));
        ctx.lineTo(PX(LX(i2)), PY(LAND[i2]));
        ctx.stroke();
    }
    ctx.restore();

    if (!SHIP[0].alive || !SHIP[1].alive)
        if (DCD === null)
        {
            DCD = 2.0;
            if (SHIP[0].alive || SHIP[1].alive)
            {
                if (SHIP[0].alive)
                    PNT[0] += 1;
                else if (SHIP[1].alive)
                    PNT[1] += 1;
            }
        }

    var D = delta * 8.0;
    if (DCD !== null)
    {
        D = 0;
        DCD -= delta;
    }

    for (var i=0; i<SHIP.length; i++)
    {
        var S = SHIP[i];
        var thrust = GAME.game.input.keyboard.isDown(S.up) && DCD === null;
        var aa = (GAME.game.input.keyboard.isDown(S.left) ? -1 : 0) +
                 (GAME.game.input.keyboard.isDown(S.right) ? 1 : 0);
        S.av -= S.av * D * 1 / 8;
        S.av += aa * D * 4.0 / 8;
        S.a += S.av * D / 8;

        S.xv -= S.xv * D * 0.1;
        S.yv -= S.yv * D * 0.1;
        S.yv += 0.25 * D;
        if (thrust)
        {
            S.xv += Math.cos(S.a - Math.PI/2) * D * 1;
            S.yv += Math.sin(S.a - Math.PI/2) * D * 1;
        }
        S.x += S.xv * D;
        S.y += S.yv * D;

        var name = 'p' + (i+1) + '-' + (thrust ? 'on' : 'off');
        var spr = GAME.game.make.sprite(0, 0, name);
        spr.anchor.set(0.5);
        spr.angle = S.a / Math.PI * 180.0;
        spr.alpha = S.alive ? 1 : 0.5;

        spr.scale.set(PSCALE(SSZ, 192.0));
        GAME.bfr.draw(spr, PX(S.x), PY(S.y));

        if (S.x < -10 || S.x > (GAME.GW*10) || S.y < -50 || S.y > 110)
            S.alive = false;
        var S2 = SHIP[(i+1)%2];
        if (((S.x-S2.x)*(S.x-S2.x) + (S.y-S2.y)*(S.y-S2.y)) < (SSZ*SSZ/2))
        {
            S.alive = false;
            S2.alive = false;
        }
        var C = collideLand(S.x, S.y, SSZ/3);
        if (C === 1)
        {
            if (S.yv > 0.0 && S.yv < 1.5 && Math.abs(S.xv) < 1.0 && Math.abs(S.a) < 0.25)
            {
                S2.alive = false;
            }
            else
            {
                S.alive = false;
            }
        }
        else if (C === 2)
            S.alive = false;
    }

    ctx.save();
    ctx.font = "" + Math.floor(PY(8)) + "px Impact";
    ctx.fillStyle = 'rgba(255, 255, 64, ' + (SHIP[1].alive ? '1' : '0.5') + ')';
    ctx.fillText(""+PNT[1], PX(GAME.GW/2 - GAME.GW/4), PY(8));
    ctx.fillStyle = 'rgba(64, 255, 255, ' + (SHIP[0].alive ? '1' : '0.5') + ')';
    ctx.fillText(""+PNT[0], PX(GAME.GW/2 + GAME.GW/4), PY(8));
    ctx.restore();
};