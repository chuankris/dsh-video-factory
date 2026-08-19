#!/usr/bin/env python3
"""True 25 fps PIL animation renderer for the DSH explainer."""
import argparse, json, math, os, re, subprocess
from functools import lru_cache
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent
W, H, FPS = 1080, 1920, 25
BG, PAPER = "#FAF8F2", "#FFFFFF"
BLUE, BLUE_2, BLUE_3, BLUE_4 = "#173F67", "#2C5E8C", "#41719E", "#5B8AB5"
BLUE_SOFT, ORANGE, ORANGE_SOFT = "#EAF1F6", "#E5762E", "#FFF0E5"
GREEN, TEXT, MUTED, LINE = "#2E8B57", "#1E2935", "#68727D", "#DDD8CE"
FONT = "/System/Library/Fonts/STHeiti Medium.ttc"

@lru_cache(maxsize=32)
def font(size): return ImageFont.truetype(FONT, int(size))
def clamp(v, lo=0., hi=1.): return max(lo, min(hi, v))
def progress(t, start, duration): return clamp((t-start)/max(duration, .001))
def ease_out(p): return 1-(1-clamp(p))**3
def ease_in_out(p):
    p=clamp(p); return 4*p**3 if p<.5 else 1-((-2*p+2)**3)/2
def overshoot(p):
    p=clamp(p); c1=1.70158; c3=c1+1
    return 1+c3*(p-1)**3+c1*(p-1)**2
def rgba(color, a=255):
    if isinstance(color, tuple): return (*color[:3], a)
    c=color.lstrip("#"); return tuple(int(c[i:i+2],16) for i in (0,2,4))+(a,)

def center_text(d, box, text, fnt, fill, spacing=12, shift=(0,0)):
    x0,y0,x1,y1=box
    bb=d.multiline_textbbox((0,0),text,font=fnt,spacing=spacing,align="center")
    tw,th=bb[2]-bb[0],bb[3]-bb[1]
    d.multiline_text(((x0+x1-tw)/2+shift[0],(y0+y1-th)/2-bb[1]+shift[1]),text,
                     font=fnt,fill=fill,spacing=spacing,align="center")

def arrow(d,a,b,color=ORANGE,width=12,p=1.):
    p=ease_out(p); end=(a[0]+(b[0]-a[0])*p,a[1]+(b[1]-a[1])*p)
    d.line([a,end],fill=color,width=width)
    if p>.92:
        ang=math.atan2(b[1]-a[1],b[0]-a[0])
        for delta in (2.55,-2.55):
            q=(end[0]+28*math.cos(ang+delta),end[1]+28*math.sin(ang+delta))
            d.line([end,q],fill=color,width=width)

def faded(im,a):
    if a>=.999:return im
    out=im.copy(); out.putalpha(out.getchannel("A").point(lambda x:int(x*clamp(a))))
    return out

def shadowed_card(im,box=(70,620,1010,1365),radius=54):
    sh=Image.new("RGBA",im.size,(0,0,0,0)); sd=ImageDraw.Draw(sh); x0,y0,x1,y1=box
    sd.rounded_rectangle((x0+4,y0+11,x1+4,y1+11),radius=radius,fill=(23,63,103,42))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(18)))
    ImageDraw.Draw(im).rounded_rectangle(box,radius=radius,fill=PAPER,outline=LINE,width=3)

def base_scene(scene,idx,total):
    im=Image.new("RGBA",(W,H),BG); shadowed_card(im); d=ImageDraw.Draw(im)
    d.rounded_rectangle((70,70,410,142),radius=36,fill=BLUE_SOFT)
    d.text((98,87),scene["chapter"],font=font(29),fill=BLUE)
    d.multiline_text((78,300),scene["headline"],font=font(76),fill=BLUE,spacing=18)
    d.rounded_rectangle((70,1482,260,1547),radius=28,fill=ORANGE)
    d.text((101,1494),"AI 生成",font=font(31),fill="white")
    d.text((290,1496),"科普内容 · 请理性判断",font=font(28),fill=MUTED)
    d.text((890,1502),f"{idx:02d}/{total:02d}",font=font(25),fill=MUTED)
    return im

def brand_dots(im,t):
    d=ImageDraw.Draw(im)
    for i in range(3):
        # Deliberately non-1-second period so adjacent-second QA samples also
        # capture a visible change during otherwise settled narration beats.
        pulse=.72+.28*(.5+.5*math.sin(t*2.1-i*.9)); r=11+int(4*pulse); x,y=874+i*45,103
        d.ellipse((x-r,y-r,x+r,y+r),fill=rgba(ORANGE,int(150+105*pulse)))

def points_strip(im,points,local,duration):
    if not points:return
    gap,left,right=16,70,1010; count=len(points)
    width=(right-left-gap*(min(count,2)-1))/(count if count<=3 else 2)
    for i,text in enumerate(points):
        row=0 if count<=3 or i<2 else 1; col=i if row==0 else i-2
        x0=left+col*(width+gap); y0=1390+row*75
        at=.5+(i+1)*max(.45,(duration-1.3)/(count+1)); a=ease_out(progress(local,at,.38))
        if a<=0:continue
        ly=Image.new("RGBA",im.size,(0,0,0,0)); d=ImageDraw.Draw(ly)
        d.rounded_rectangle((x0,y0,x0+width,y0+60),radius=25,fill=rgba(BLUE_SOFT,245),outline=rgba(BLUE,70),width=2)
        center_text(d,(x0+8,y0+4,x0+width-8,y0+56),text,font(26),BLUE)
        im.alpha_composite(faded(ly,a))

def visual_hook(im,t):
    d=ImageDraw.Draw(im)
    p=overshoot(progress(t,.2,.75)); r=115*p
    if p>0:
        d.ellipse((220-r,850-r,220+r,850+r),fill=BLUE)
        if p>.55:center_text(d,(105,735,335,965),"大脑",font(40),"white")
    arrow(d,(350,850),(475,850),p=progress(t,1.2,.65))
    wp=overshoot(progress(t,1.8,.8))
    if wp>0:
        x=1110+(500-1110)*wp
        d.rounded_rectangle((x,700,x+390,1240),radius=45,fill=BLUE_SOFT,outline=BLUE,width=6)
        center_text(d,(x+20,725,x+370,805),"工作台",font(40),BLUE)
        for i,(lab,y) in enumerate([("换零件",835),("出错",955),("安全退回",1075)]):
            a=ease_out(progress(t,2.5+i*.65,.45))
            if a<=0:continue
            fill=ORANGE if i==1 else (GREEN if i==2 else BLUE_2)
            d.rounded_rectangle((x+60,y,x+330,y+105),radius=28,fill=fill)
            center_text(d,(x+70,y+4,x+320,y+101),lab,font(31),"white")
    a=ease_out(progress(t,4.8,.6))
    if a>0:
        ly=Image.new("RGBA",im.size,(0,0,0,0)); ld=ImageDraw.Draw(ly)
        center_text(ld,(170,1260,910,1340),"DSH：让换错之后也能收场",font(37),ORANGE)
        im.alpha_composite(faded(ly,a))

def visual_harness(im,t):
    d=ImageDraw.Draw(im); p=ease_out(progress(t,.25,.65))
    if p>0:
        r=150*p; d.ellipse((540-r,850-r,540+r,850+r),fill=BLUE)
        if p>.55:center_text(d,(390,700,690,1000),"大脑\n模型",font(40),"white")
    arrow(d,(540,1015),(540,1115),p=progress(t,2.45,.7))
    for i,(lab,x) in enumerate([("工具",160),("记忆",455),("权限",750)]):
        p=overshoot(progress(t,3.15+i*.45,.65))
        if p<=0:continue
        xx=-230+(x+230)*p; y=1160
        d.rounded_rectangle((xx,y,xx+200,y+145),radius=30,fill=ORANGE_SOFT,outline=ORANGE,width=5)
        center_text(d,(xx,y,xx+200,y+145),lab,font(36),ORANGE)
    a=ease_out(progress(t,5.55,.75))
    if a>0:
        ly=Image.new("RGBA",im.size,(0,0,0,0)); ld=ImageDraw.Draw(ly)
        center_text(ld,(190,1302,890,1350),"Harness：智能体的工作台",font(34),BLUE)
        im.alpha_composite(faded(ly,a))

def visual_plugins(im,t):
    d=ImageDraw.Draw(im)
    d.rounded_rectangle((145,700,935,1245),radius=48,fill="#FFFDF8",outline=MUTED,width=7)
    center_text(d,(225,715,855,790),"过去的 agent",font(39),MUTED)
    labels=["工具","连接","状态"]
    for i,(lab,x) in enumerate(zip(labels,[255,475,695])):
        p=overshoot(progress(t,.35+i*.55,.7))
        if p<=0:continue
        d.rounded_rectangle((x,865,x+170,1015),radius=28,fill=BLUE_2)
        center_text(d,(x,870,x+170,1010),lab,font(34),"white")
        if p>.7:
            d.line((x+85,1015,x+85,1110),fill=ORANGE,width=14)
            d.ellipse((x+65,1090,x+105,1130),fill=ORANGE)
    for i in range(2):
        a=ease_out(progress(t,2.8+i*.45,.6))
        if a>0:d.line((425+i*220,940,475+i*220,940),fill=ORANGE,width=max(2,int(14*a)))
    sp=progress(t,4.15,.8); pulse=math.sin(sp*math.pi) if 0<sp<1 else 0
    if sp>0:
        center_text(d,(180,1150,900,1225),"换一处 → 重启 · 残留 · 连锁损坏",font(34),ORANGE)
        for x in (345,565,785):
            rr=18+18*pulse; d.ellipse((x-rr,1110-rr,x+rr,1110+rr),fill=ORANGE)

def visual_temporal(im,t):
    d=ImageDraw.Draw(im); lp=overshoot(progress(t,.18,.6))
    if lp>0:
        x=-420+570*lp; d.rounded_rectangle((x,730,x+350,1110),radius=40,fill=BLUE_SOFT,outline=BLUE,width=5)
        center_text(d,(x+20,750,x+330,830),"装零件",font(42),BLUE)
    ex=ease_out(progress(t,1.45,1)); rev=ease_in_out(progress(t,7,1.15)); ry=990-180*ex+180*rev
    if ex>0 and rev<1:
        d.rounded_rectangle((185,ry,465,ry+145),radius=25,fill=PAPER,outline=LINE,width=3)
        center_text(d,(200,ry+8,450,ry+137),"还原回执",font(34),BLUE)
    arrow(d,(535,900),(695,900),width=14,p=progress(t,2.55,.85))
    rp=overshoot(progress(t,3.55,.7))
    if rp>0:
        x=1080+(730-1080)*rp; d.rounded_rectangle((x,730,x+350,1110),radius=40,fill=ORANGE_SOFT,outline=ORANGE,width=5)
        center_text(d,(x+20,750,x+330,830),"拆零件",font(42),ORANGE)
        d.rounded_rectangle((x+35,880,x+315,1025),radius=25,fill=PAPER)
        center_text(d,(x+50,890,x+300,1015),"倒着恢复",font(32),ORANGE)
    a=ease_out(progress(t,5.35,.6))
    if a>0:
        ly=Image.new("RGBA",im.size,(0,0,0,0)); ld=ImageDraw.Draw(ly)
        center_text(ld,(170,1190,910,1280),"系统回到它没来过的样子",font(36),BLUE); im.alpha_composite(faded(ly,a))

def rolling_node(d,label,start_x,target_x,y,p,active):
    p=ease_out(p)
    if p<=0:return
    x=start_x+(target_x-start_x)*p; r=58; fill=ORANGE if active else MUTED
    d.ellipse((x-r,y-r,x+r,y+r),fill=fill)
    ang=(1-p)*math.pi*3
    d.line((x,y,x+35*math.cos(ang),y+35*math.sin(ang)),fill="white",width=7)
    center_text(d,(x-r,y-r,x+r,y+r),label,font(36),"white")

def visual_spatial(im,t):
    d=ImageDraw.Draw(im)
    d.rounded_rectangle((170,690,910,875),radius=40,fill="#FFFDF8",outline=BLUE,width=5)
    center_text(d,(200,715,880,850),"零件声明：我需要 A 和 B",font(36),BLUE)
    ap=progress(t,.8,.8); bp=progress(t,1.75,.8); removed=ease_in_out(progress(t,4.55,.55))
    # Establish the initial state explicitly before either dependency rolls in.
    for label,x,until in (("A",400,.8),("B",680,1.75)):
        if t<until:
            d.ellipse((x-58,957,x+58,1073),fill=MUTED)
            center_text(d,(x-58,957,x+58,1073),label,font(36),"white")
    rolling_node(d,"A",-80,400,1015,ap,ap>=.98)
    rolling_node(d,"B",1160,680+250*removed,1015,bp,bp>=.98 and removed<.5)
    active=ease_out(progress(t,2.55,.45))*(1-removed); stopped=ease_out(progress(t,4.7,.4))
    c1=ORANGE if active>.25 else MUTED; c2=ORANGE if stopped>.25 else MUTED
    center_text(d,(190,1120,890,1200),"到齐 → 自动开工",font(42),c1)
    center_text(d,(190,1230,890,1310),"拿走 → 自动停下",font(40),c2)
    lamp=c2 if stopped>.25 else c1; d.ellipse((820,1148,856,1184),fill=lamp)

def visual_contrast(im,t):
    d=ImageDraw.Draw(im)
    d.rounded_rectangle((110,690,500,1270),radius=44,fill="#FFFDF8",outline=MUTED,width=6)
    center_text(d,(130,720,480,800),"只会改自己",font(38),MUTED)
    box=(220,860,390,1030); start=(t*150)%360
    d.arc(box,start=start,end=start+280,fill=MUTED,width=16)
    a=math.radians(start+280); cx=305+85*math.cos(a); cy=945+85*math.sin(a)
    d.polygon([(cx,cy),(cx-25,cy+2),(cx-5,cy-24)],fill=MUTED)
    center_text(d,(140,1080,470,1200),"改坏之后\n无法收场",font(35),MUTED)
    center_text(d,(500,880,590,1030),"vs",font(64),ORANGE)
    d.rounded_rectangle((590,690,970,1270),radius=44,fill=BLUE_SOFT,outline=BLUE,width=6)
    center_text(d,(620,720,940,800),"可控改造",font(40),BLUE)
    oldp=ease_in_out(progress(t,1,.9)); newp=overshoot(progress(t,2,.9)); ox=650-1000*oldp
    d.rounded_rectangle((ox,865,ox+250,1005),radius=28,fill=MUTED)
    center_text(d,(ox,865,ox+250,1005),"错误改动",font(30),"white")
    nx=1040+(650-1040)*newp; flash=math.sin(progress(t,2.85,.7)*math.pi) if 2.85<t<3.55 else 0
    fill=GREEN if flash>.10 else BLUE
    d.rounded_rectangle((nx,865,nx+250,1005),radius=28,fill=fill)
    center_text(d,(nx,865,nx+250,1005),"安全退回",font(32),"white")
    center_text(d,(620,1080,940,1200),"先能退回\n再谈自主",font(35),BLUE)

def visual_finale(im,t):
    d=ImageDraw.Draw(im); gy=1250; d.line((130,gy,950,gy),fill=BLUE,width=12)
    for i,(x,label,c) in enumerate([(210,"盒子",BLUE_SOFT),(410,"插件",BLUE_2),(610,"插件",BLUE_3)]):
        p=overshoot(progress(t,.35+i*.5,.8))
        if p<=0:continue
        y=-120+(1120+120)*p
        d.rounded_rectangle((x,y,x+170,y+110),radius=25,fill=c,outline=BLUE if i==0 else c,width=4)
        center_text(d,(x,y,x+170,y+110),label,font(28),BLUE if i==0 else "white")
    gp=ease_out(progress(t,3,2.5)); top=gy-480*gp
    if gp>0:
        d.line((290,gy,290,top,790,top,790,gy),fill=BLUE,width=12)
        for i in range(int(4*gp)):
            y=gy-100*(i+1); d.line((300,y,780,y),fill=BLUE_3,width=7)
            for x in (350,480,610,740):d.rectangle((x,y-65,x+48,y-18),fill=BLUE_SOFT)
    cap=overshoot(progress(t,7,.8))
    if cap>0:
        width=590*cap; x=540-width/2; d.rounded_rectangle((x,1245,x+width,1345),radius=50,fill=ORANGE)
        if cap>.72:center_text(d,(255,1252,825,1338),"开发者预览版 · 大楼还在盖",font(34),"white")

VISUALS={"hook":visual_hook,"harness":visual_harness,"plugins":visual_plugins,
         "temporal":visual_temporal,"spatial":visual_spatial,"contrast":visual_contrast,"finale":visual_finale}

def ts_seconds(s):
    h,m,rest=s.replace(',','.').split(':'); return int(h)*3600+int(m)*60+float(rest)

def parse_vtt():
    text=(ROOT/"narration.vtt").read_text(encoding="utf-8")
    pat=re.compile(r"(\d\d:\d\d:\d\d[,.]\d+)\s+-->\s+(\d\d:\d\d:\d\d[,.]\d+)\s*\n([^\n]+)")
    return [(ts_seconds(a),ts_seconds(b),t.strip()) for a,b,t in pat.findall(text)]

def get_scene_starts(data,cues):
    lines=(ROOT/"script.txt").read_text(encoding="utf-8").splitlines(); mapping={}; ci=0
    for i,line in enumerate(lines):
        if line.strip():mapping[i]=ci; ci+=1
    out=[]
    for scene in data["scenes"]:
        i=scene["line_start"]
        while i<len(lines) and not lines[i].strip():i+=1
        out.append(cues[mapping[i]][0])
    return out

TOKEN_RE=re.compile(r"[A-Za-z]+(?:[-'][A-Za-z]+)*|\d+(?:\.\d+)?|\s+|.")
def split_caption(text,max_width=825,max_lines=2):
    """Pixel-aware chunks; English tokens such as Harness are indivisible."""
    tokens=TOKEN_RE.findall(re.sub(r"\s+"," ",text.strip())); f=font(54); chunks=[]; lines=[]; line=""
    for tok in tokens:
        # Closing punctuation belongs to the preceding unit, even if that unit
        # becomes a few pixels wider; the final renderer can safely shrink it.
        if tok in "，。！？；：、）】》”’":
            line+=tok
            continue
        candidate=line+tok
        if f.getlength(candidate)<=max_width or not line:line=candidate
        else:
            lines.append(line.strip()); line=tok.lstrip()
            if len(lines)==max_lines:chunks.append("\n".join(lines)); lines=[]
    if line:lines.append(line.strip())
    if lines:chunks.append("\n".join(lines))
    return [c for c in chunks if c]

def caption_segments(cues):
    segs=[]
    for i,(a,b,text) in enumerate(cues):
        if i+1<len(cues):b=min(b,cues[i+1][0])
        chunks=split_caption(text); weights=[max(1,len(re.sub(r"\s","",x))) for x in chunks]; pos=a; total=sum(weights)
        for j,(chunk,w) in enumerate(zip(chunks,weights)):
            end=b if j==len(chunks)-1 else pos+(b-a)*w/total
            segs.append((pos,end,chunk)); pos=end
    return segs

def draw_captions(im,t,segs):
    fade=.12; active=[]
    for a,b,text in segs:
        if a-fade<=t<=b+fade:
            alpha=min(clamp((t-(a-fade))/fade),clamp(((b+fade)-t)/fade)); active.append((alpha,a,text))
    for alpha,_,text in sorted(active,key=lambda x:x[1]):
        if alpha<=0:continue
        ly=Image.new("RGBA",im.size,(0,0,0,0)); d=ImageDraw.Draw(ly)
        d.rounded_rectangle((70,1635,1010,1815),radius=42,fill=rgba(BLUE,235)); size=54
        while size>40:
            bb=d.multiline_textbbox((0,0),text,font=font(size),spacing=12,align="center")
            if bb[2]-bb[0]<=830 and bb[3]-bb[1]<=130:break
            size-=2
        center_text(d,(105,1650,975,1800),text,font(size),PAPER,spacing=12)
        im.alpha_composite(faded(ly,alpha))

def end_card(t):
    im=Image.new("RGBA",(W,H),BLUE); d=ImageDraw.Draw(im)
    for i in range(3):
        x=874+i*45; d.ellipse((x-14,89,x+14,117),fill=ORANGE)
    shadowed_card(im,(90,320,990,1330),70); d=ImageDraw.Draw(im)
    d.rounded_rectangle((360,430,720,515),radius=42,fill=BLUE_SOFT)
    center_text(d,(380,440,700,505),"DeepSeek Harness",font(31),BLUE)
    p=ease_out(progress(t,.08,.7)); y=32*(1-p)
    ly=Image.new("RGBA",im.size,(0,0,0,0)); ld=ImageDraw.Draw(ly)
    center_text(ld,(145,575+y,935,980+y),"先把换零件\n这件事做对",font(67),BLUE,spacing=28)
    im.alpha_composite(faded(ly,p)); d=ImageDraw.Draw(im)
    center_text(d,(180,1040,900,1180),"可控换件 · 失败退回 · 边界清楚",font(39),ORANGE)
    d.rounded_rectangle((350,1460,730,1595),radius=62,fill=ORANGE)
    center_text(d,(370,1470,710,1585),"AI 生成",font(54),"white")
    center_text(d,(140,1660,940,1740),"科普内容 · 请理性判断",font(32),"#D9E5EE")
    return im

def render_frame(t,data,starts,captions,bases):
    voice_end=captions[-1][1]
    if t>=voice_end:return end_card(t-voice_end).convert("RGB")
    eligible=[i for i,s in enumerate(starts) if t>=s]
    idx=max(eligible) if eligible else 0
    local=max(0,t-starts[idx])
    duration=(starts[idx+1] if idx+1<len(starts) else voice_end)-starts[idx]
    im=bases[idx].copy(); brand_dots(im,t); VISUALS[data["scenes"][idx]["visual"]](im,local)
    points_strip(im,data["scenes"][idx]["points"],local,duration); draw_captions(im,t,captions)
    return im.convert("RGB")

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--preview",type=float); args=ap.parse_args()
    data=json.loads((ROOT/"script.json").read_text(encoding="utf-8")); cues=parse_vtt()
    starts=get_scene_starts(data,cues); captions=caption_segments(cues); voice_end=cues[-1][1]; total=voice_end+1.5
    (ROOT/"timing.json").write_text(json.dumps({"scene_starts":starts+[total],"duration":total},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    bases=[base_scene(s,i+1,len(data["scenes"])) for i,s in enumerate(data["scenes"])]
    if args.preview is not None:
        out=ROOT/"work"/"preview.png"; out.parent.mkdir(parents=True,exist_ok=True)
        render_frame(clamp(args.preview,0,total),data,starts,captions,bases).save(out); print(out); return
    frames=math.ceil(total*FPS); qa=ROOT/"work"/"frames"; qa.mkdir(parents=True,exist_ok=True)
    qa_frames={round(x*FPS) for x in [1.8,10.8,24.,41.2,43.8,48.4,57.8,62.5]}
    silent=ROOT/"work"/"animated_silent.mp4"
    cmd=["ffmpeg","-y","-loglevel","error","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-","-an","-c:v","libx264","-preset","medium","-crf","18","-pix_fmt","yuv420p","-movflags","+faststart",str(silent)]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    try:
        for n in range(frames):
            t=n/FPS; frame=render_frame(t,data,starts,captions,bases)
            if n in qa_frames:frame.save(qa/f"qa_{t:06.2f}.jpg",quality=94)
            proc.stdin.write(frame.tobytes())
            if n%250==0:print(f"rendered {n}/{frames} frames",flush=True)
    finally:
        if proc.stdin:proc.stdin.close()
    if proc.wait()!=0:raise SystemExit("video encode failed")
    target=ROOT/"dsh_agent_interaction.mp4"; temp=ROOT/"work"/"dsh_agent_interaction.new.mp4"
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",str(silent),"-i",str(ROOT/"narration.mp3"),"-filter_complex","[1:a]apad=pad_dur=2[a]","-map","0:v:0","-map","[a]","-c:v","copy","-c:a","aac","-b:a","160k","-t",f"{frames/FPS:.3f}","-movflags","+faststart",str(temp)],check=True)
    os.replace(temp,target); print(f"wrote {target} ({frames} frames, {frames/FPS:.3f}s)")

if __name__=="__main__":main()
