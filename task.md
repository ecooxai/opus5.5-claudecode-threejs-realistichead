# Task (verbatim from user)

work for 30mins at most, you can use opus 5.5 high as subagent in this session now to speed up dev.

/goal build highest quality 3A 3d

build 3d scene or charecters in web, make it look same in the image.
download and view the images,
dont use existed files assets from local or internet, build from scratch by yourself
put your model name above 3d model

ref image: https://lesswebdisk.my-team-8435.chatgpt.site/raw/u-oKDfM5n2PVKJ/pic/womanhead.png  (local copy: ref/womanhead.png)

$work_env= use local pc
$project_dir= .
$dev_tools= prefer web dev tech, chrome (prefer headless), make sure webgpu webgl works in browser first. then blender (headless)
$output=./dist
$goal_score= 98/100

(Full rule text: see agent rules below — dev manage, iterate, context improve, 3d, linux, post task.)

## dev manage
keep project and code clean. git branch with model name. worktrees at ../ (max 4).
monitor cpu/ram every 1s when testing. name outputs with model + tool names.

## iterate
score n/100 every iteration; record test/build times; investigate if >5min.

## 3d
no external assets, build from scratch, use own vision to compare, 4 side views natural.
light blue bg default. show iteration number and score bottom right of previewer UI.
prefer web, prefer WebGPU; prompt user to fallback to WebGL (never auto-fallback, except dev preview).
settings UI: backend + resolution. default 900x1200, canvas CSS size == render resolution;
presets 480/1280/1080/2k/4k portrait or landscape. CSS width 1/2 if window < 900.

## linux headless gpu
__EGL_VENDOR_LIBRARY_FILENAMES=/usr/share/glvnd/egl_vendor.d/10_nvidia.json chromium --headless=new --enable-unsafe-webgpu --ignore-gpu-blocklist --enable-features=Vulkan --use-angle=gl-egl

## post task
update AGENTS.md, agent/continue.md, agent/status.md (archive old ones).
push git + deploy (github pages / cloudflare).
showcase copies with model + tool name in big white font on black bg in ./dist.
videos 1000x1200 and 1600x1000, 60s: final work 40s, "first iteration" 2s, iterations 13s, last iteration 5s;
iteration number + minutes overlay; model name 50px bottom black bg; tool name + hours smaller.
if goal not finished, write continuation prompt for the next agent.
