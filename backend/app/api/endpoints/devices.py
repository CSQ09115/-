"""
设备数据接口（护花使者 IoT 模块）
=================================
接口一览：
  POST /api/devices/{code}/readings   设备上报一条数据（首次上报自动注册设备）
  GET  /api/devices                   设备列表（含最新读数、是否需要浇水）
  GET  /api/devices/{code}/latest     某设备最新一条数据
  GET  /api/devices/{code}/history    历史数据（?limit=50）
  POST /api/devices/{code}/bind       把设备绑定到用户/花盆

⚠️ 安全设计说明（答辩会被问到）：
  上报接口**不做登录鉴权**，因为 ESP32 是资源受限设备，无法走 OAuth/JWT 流程。
  业界通行做法是用设备级凭据（本项目后续可加 device_token 或 MQTT 双向证书）。
  目前仅在内网使用，正式部署前必须补上设备认证，否则任何人都能伪造数据。
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.models.device import Device, SensorReading, DRY_THRESHOLD
from app.schemas.device import (
    ReadingCreate, ReadingResponse, DeviceResponse,
    LatestResponse, DeviceBindRequest
)

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.post("/{code}/readings", response_model=ReadingResponse)
def post_reading(code: str, payload: ReadingCreate, db: Session = Depends(get_db)):
    """
    设备上报数据。
    设备第一次上报时自动注册（省去手工录入设备台账的麻烦）。
    """
    now = datetime.utcnow()

    device = db.query(Device).filter(Device.code == code).first()
    if device is None:
        device = Device(code=code, name=f"设备 {code}", last_seen=now, created_at=now)
        db.add(device)
    else:
        device.last_seen = now

    # 顺带更新设备的固件版本和 IP（设备每次上报都会带上）
    if payload.firmware:
        device.firmware = payload.firmware
    if payload.ip_address:
        device.ip_address = payload.ip_address

    reading = SensorReading(
        device_code=code,
        soil_moisture=payload.soil_moisture,
        soil_temp=payload.soil_temp,
        air_temp=payload.air_temp,
        air_humidity=payload.air_humidity,
        light_lux=payload.light_lux,
        created_at=now,
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)
    return reading


@router.get("", response_model=List[DeviceResponse])
def list_devices(db: Session = Depends(get_db)):
    """设备列表：每台设备附带最新读数和"是否需要浇水"判断"""
    devices = db.query(Device).all()
    result = []
    for d in devices:
        latest = (db.query(SensorReading)
                  .filter(SensorReading.device_code == d.code)
                  .order_by(desc(SensorReading.created_at))
                  .first())
        result.append(DeviceResponse(
            code=d.code,
            name=d.name or "",
            plant_name=d.plant_name or "",
            location=d.location or "",
            firmware=d.firmware or "",
            ip_address=d.ip_address or "",
            last_seen=d.last_seen,
            latest=ReadingResponse.model_validate(latest) if latest else None,
            need_water=(latest.soil_moisture is not None
                        and latest.soil_moisture < DRY_THRESHOLD),
            dry_threshold=DRY_THRESHOLD,
        ))
    return result


@router.get("/{code}/latest", response_model=LatestResponse)
def get_latest(code: str, db: Session = Depends(get_db)):
    """某设备的最新一条数据（App 端首页展示用这个）"""
    r = (db.query(SensorReading)
         .filter(SensorReading.device_code == code)
         .order_by(desc(SensorReading.created_at))
         .first())
    if not r:
        raise HTTPException(status_code=404, detail="该设备还没有上报过数据")

    return LatestResponse(
        device_code=r.device_code,
        soil_moisture=r.soil_moisture,
        soil_temp=r.soil_temp,
        air_temp=r.air_temp,
        air_humidity=r.air_humidity,
        light_lux=r.light_lux,
        created_at=r.created_at,
        need_water=(r.soil_moisture is not None and r.soil_moisture < DRY_THRESHOLD),
        dry_threshold=DRY_THRESHOLD,
    )


@router.get("/{code}/history", response_model=List[ReadingResponse])
def get_history(code: str, limit: int = Query(50, ge=1, le=500),
                db: Session = Depends(get_db)):
    """历史数据，用于画趋势曲线（App 端图表用）"""
    return (db.query(SensorReading)
            .filter(SensorReading.device_code == code)
            .order_by(desc(SensorReading.created_at))
            .limit(limit)
            .all())


@router.post("/{code}/bind")
def bind_device(code: str, payload: DeviceBindRequest, db: Session = Depends(get_db)):
    """把设备绑定到某个用户和某盆花（App 端"添加设备"时调用）"""
    device = db.query(Device).filter(Device.code == code).first()
    if device is None:
        raise HTTPException(status_code=404, detail="设备不存在，请先让设备上电上报一次")
    if payload.user_id is not None:
        device.user_id = payload.user_id
    if payload.plant_name is not None:
        device.plant_name = payload.plant_name
    if payload.location is not None:
        device.location = payload.location
    if payload.name is not None:
        device.name = payload.name
    db.commit()
    return {"message": "绑定成功", "code": device.code, "plant_name": device.plant_name}


@router.get("/mobile", response_class=HTMLResponse, include_in_schema=False)
def mobile_monitor():
    """
    移动端实时监控页（手机浏览器直接打开即可，无需安装 App）
    用途：开发调试阶段快速验证"设备 → 后台 → 手机"链路是否通畅；
          也方便现场答辩时临时用手机演示。
    访问：http://<电脑IP>:8000/api/devices/mobile
    """
    return HTMLResponse(content="""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>护花使者 · 实时监测</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;
     background:#f5f7f5;color:#222;padding:16px;line-height:1.6}
h1{font-size:19px;margin-bottom:4px}
.sub{font-size:12px;color:#888;margin-bottom:16px}
.card{background:#fff;border-radius:14px;padding:18px;margin-bottom:14px;
      box-shadow:0 1px 4px rgba(0,0,0,.07)}
.row{display:flex;justify-content:space-between;align-items:center;
     padding:9px 0;border-bottom:1px solid #f0f0f0}
.row:last-child{border-bottom:none}
.k{color:#666;font-size:14px}
.v{font-size:19px;font-weight:600}
.alert{background:#fff3f0;border-left:4px solid #e5484d;border-radius:8px;
       padding:12px 14px;margin-top:12px;color:#c1272d;font-size:14px}
.ok{background:#eefaf1;border-left:4px solid #30a46c;border-radius:8px;
    padding:12px 14px;margin-top:12px;color:#18794e;font-size:14px}
.empty{text-align:center;color:#999;padding:30px 0;font-size:14px}
.tip{font-size:12px;color:#999;text-align:center;margin-top:18px}
</style>
</head>
<body>
<h1>护花使者 · 实时监测</h1>
<div class="sub" id="time">加载中...</div>
<div id="list"><div class="empty">正在读取设备数据...</div></div>
<div class="tip">页面每 5 秒自动刷新</div>
<script>
async function load(){
  try{
    const r = await fetch('/api/devices');
    const data = await r.json();
    const now = new Date().toLocaleTimeString('zh-CN');
    document.getElementById('time').textContent = '更新于 ' + now;
    if(!data.length){
      document.getElementById('list').innerHTML =
        '<div class="empty">还没有设备上报数据<br>请确认 ESP32 已上电并联网</div>';
      return;
    }
    document.getElementById('list').innerHTML = data.map(d=>{
      const l = d.latest;
      const rows = [];
      if(l){
        if(l.soil_moisture!=null) rows.push(row('土壤湿度', l.soil_moisture.toFixed(1)+' %'));
        if(l.soil_temp!=null)     rows.push(row('土壤温度', l.soil_temp.toFixed(1)+' ℃'));
        if(l.air_temp!=null)      rows.push(row('空气温度', l.air_temp.toFixed(1)+' ℃'));
        if(l.air_humidity!=null)  rows.push(row('空气湿度', l.air_humidity.toFixed(1)+' %'));
        if(l.light_lux!=null)     rows.push(row('光照强度', l.light_lux.toFixed(0)+' lux'));
      } else {
        rows.push('<div class="empty">暂无读数</div>');
      }
      const warn = d.need_water
        ? '<div class="alert">土壤湿度 ' + (l?l.soil_moisture.toFixed(1):'-') +
          '% 低于阈值 ' + d.dry_threshold + '%，该浇水了！</div>'
        : '<div class="ok">水分充足，无需浇水</div>';
      return '<div class="card">' +
        '<div class="row"><span class="k">'+esc(d.name)+'</span>'+
        '<span class="k" style="font-size:12px">'+esc(d.code)+'</span></div>' +
        (d.plant_name ? '<div class="row"><span class="k">植物</span><span>'+esc(d.plant_name)+'</span></div>' : '') +
        rows.join('') +
        '<div class="row"><span class="k">最后上报</span><span style="font-size:12px">'+
        (l?new Date(l.created_at).toLocaleString('zh-CN'):'-')+'</span></div>' +
        warn + '</div>';
    }).join('');
  }catch(e){
    document.getElementById('list').innerHTML =
      '<div class="empty">读取失败：'+esc(String(e))+'</div>';
  }
}
function row(k,v){
  return '<div class="row"><span class="k">'+k+'</span><span class="v">'+v+'</span></div>';
}
function esc(s){
  return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
load();
setInterval(load,5000);
</script>
</body>
</html>""")
