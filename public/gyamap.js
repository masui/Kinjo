//
// 現在地の近所のPOIをリストする
// 位置データはFirebase functionで取得
//

var curpos = {} // 地図の中心座標
var curzoom = 10

var locations = [] // POIリスト

var map // GoogleMapsオブジェクト

const blankimage = 'https://i.gyazo.com/a9dd5417ae63c06ccddc2040adbd04af.png' // 空白画像
var selectedimage = blankimage

var clicked = false
var clicktime

$(function () {
    // URL引数の解析
    let args = {}
    document.location.search.substring(1).split('&').forEach((s) => {
        if (s != '') {
            let [name, value] = s.split('=')
            args[name] = decodeURIComponent(value)
        }
    })

    if (args['loc']) {
        var match = args['loc'].match(/[NS]([\d\.]*),[EW]([\d\.]*),Z(.*)/)
        if (match) {
            curpos.latitude = Number(match[1])
            curpos.longitude = Number(match[2])
            curpos.zoom = Number(match[3])
        }
    }
    if (curpos.latitude) {
        initGoogleMaps(curpos.latitude, curpos.longitude)
        showlists()
    }
    else {
        console.log("getCurrentPosition()")
        navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
    }

    // [/Gyamap] からデータ取得
    let title = 'Gyamap'
    if (args['title']) {
        title = args['title']
    }
    else { // Gyamap.com/逗子八景 みたいなURL
        let match = location.href.match(/\/([^\/]+)$/)
        if (match) {
            title = match[1]
        }
    }

    if(type == 'project'){
        fetch(`/project_entries/${title}`)
            .then((response) => response.text())
            .then((data) => {
                locations = JSON.parse(data)
                locSearchAndDisplay(true) ///////
            })
    }
    else {
        fetch(`/page_entries/${title}`)
        .then((response) => response.text())
        .then((data) => {
            locations = JSON.parse(data)
            locSearchAndDisplay(true) ///////
        })
    }
})

// 距離計算
function distance(lat1, lng1, lat2, lng2) {
    const R = Math.PI / 180;
    lat1 *= R; // ラジアンに変換
    lng1 *= R;
    lat2 *= R;
    lng2 *= R;
    return 6371 * Math.acos(Math.cos(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1) + Math.sin(lat1) * Math.sin(lat2));
}

// 方位角
function angle(lat1, lng1, lat2, lng2) {
    const R = Math.PI / 180;
    lat1 *= R
    lng1 *= R
    lat2 *= R
    lng2 *= R
    let deltax = lng2 - lng1
    let y = Math.sin(deltax)
    let x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(deltax)
    let psi = Math.atan2(y, x) * 180 / Math.PI
    if (psi < 0) psi += 360
    return psi
}

// 方位角を方位名に変える
function direction(angle) {
    if (angle < 22.5) return 'N'
    if (angle < 67.5) return 'NE'
    if (angle < 112.5) return 'E'
    if (angle < 157.5) return 'SE'
    if (angle < 202.5) return 'S'
    if (angle < 247.5) return 'SW'
    if (angle < 292.5) return 'W'
    if (angle < 337.5) return 'NW'
    return 'N'
}

function locSearchAndDisplay(showimages) {
    //alert('locSearchAndDisp')
    // $('<img>').attr('src',blankimage).attr('height',400).appendTo('#imagelist')
    let mapcenter = map.getCenter();
    curpos.latitude = mapcenter.lat()
    curpos.longitude = mapcenter.lng()
    showlists()
    
    if(showimages){
        $('#imagelist').empty()
        for (let i = 0; i < 6; i++) {
            let img = $('<img>')
            img.attr('src', `${locations[i].photo}/raw`)
                .css('height', '130px')
                .css('margin', '4px')
                .css('border-radius','4px')
                .appendTo('#imagelist')
            img.attr('index', i)
            img.click(function (e) {
                let ind = $(e.target).attr('index')
                map.panTo(new google.maps.LatLng(locations[ind].latitude, locations[ind].longitude))

                selectedimage = `${locations[ind].photo}/raw`
                $('#imagelist').empty()
                $('<img>')
                    .attr('src', selectedimage)
                    .attr('height', 400)
                    .css('margin', '4px')
                    .css('border-radius','4px')
                    .appendTo('#imagelist')
                locSearchAndDisplay(false)
            })
        }
    }  
}

function initGoogleMaps(lat, lng) {
    console.log("initGoogleMaps()")
    var latlng = new google.maps.LatLng(lat, lng)
    var myOptions = {
        zoom: 14,
        center: latlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
    console.log("map generated")

    // http://sites.google.com/site/gmapsapi3/Home/v3_reference
    google.maps.event.addListener(map, 'dragend', function () {
        $('#image').attr('src', blankimage)
        clicked = false
        locSearchAndDisplay(true)
    })
    //google.maps.event.addListener(map, 'click', locSearchAndDisplay);
    //google.maps.event.addListener(map, 'zoom_changed', locSearchAndDisplay);
}

function showlists() {
    console.log('showlists()')
    for (var i = 0; i < locations.length; i++) {
        entry = locations[i]
        entry.distance = distance(entry.latitude, entry.longitude, curpos.latitude, curpos.longitude)
    }
    locations.sort((a, b) => { // 近い順にソート
        return a.distance > b.distance ? 1 : -1;
    });

    $('#list').empty()
    for (var i = 0; i < 20 && i < locations.length; i++) {
        let loc = locations[i]
        let li = $('<li>')
        let e = $('<a>')
            .text(loc.title)
            .attr('href', `https://scrapbox.io/${project}/${loc.title}`)
            .attr('target', '_blank')
        li.append(e)
        li.append($('<span>').text(' '))

        let img = $('<img>')
        let d = direction(angle(curpos.latitude, curpos.longitude, loc.latitude, loc.longitude))
        img.attr('src', `https://Gyamap.com/move_${d}.png`)
        //img.attr('src',`/move_${d}.png`)
        img.attr('height', '15px')
        img.attr('latitude', loc.latitude)
        img.attr('longitude', loc.longitude)
        img.attr('zoom', loc.zoom)
        img.attr('photo', loc.photo)
        img.click(function (e) {
            clicktime = Date.now()
            map.panTo(new google.maps.LatLng($(e.target).attr('latitude'), $(e.target).attr('longitude')))

            selectedimage = `${$(e.target).attr('photo')}/raw`
            $('#imagelist').empty()
            $('<img>')
                .attr('src', selectedimage)
                .attr('height', 400)
                .css('border-radius','4px')
                .css('margin','4px')
                .appendTo('#imagelist')
                    curpos.latitude = $(e.target).attr('latitude')
            curpos.longitude = $(e.target).attr('longitude')
            clicked = true
            showlists()
        })
        img.mouseover(function (e) {
            if (Date.now() - clicktime > 500) { // クリック後すぐのmouseoverは無視
                $('#imagelist').empty()
                $('<img>')
                    .attr('src', `${$(e.target).attr('photo')}/raw`)
                    .attr('height', 400)
                    .css('border-radius','4px')
                    .css('margin','4px')
                    .appendTo('#imagelist')
            }
        })
        img.mouseleave(function (e) {
            $('#imagelist').empty()
            $('<img>')
                .attr('src', selectedimage)
                .attr('height',400)
                .css('border-radius','4px')
                .css('margin','4px')
                .appendTo('#imagelist')
        })
        if (!clicked || i != 0) {
            li.append(img)
        }

        li.append($('<span>').text(' '))
        let desc = $("<span>")
        desc.text(loc.desc)
        li.append(desc)

        $('#list').append(li)
    }
}

function successCallback(position) {
    mapsurl = "https://maps.google.com/maps?q=" +
        position.coords.latitude + "," +
        position.coords.longitude;
    curpos.latitude = position.coords.latitude
    curpos.longitude = position.coords.longitude
    initGoogleMaps(curpos.latitude, curpos.longitude)
    showlists()
}
function errorCallback(error) {
    var err_msg = "";
    switch (error.code) {
        case 1:
            err_msg = "位置情報の利用が許可されていません";
            break;
        case 2:
            err_msg = "デバイスの位置が判定できません";
            break;
        case 3:
            err_msg = "タイムアウトしました";
            break;
    }
    alert(err_msg)
    //document.getElementById("show_result").innerHTML = err_msg;
}
