//http://stackoverflow.com/a/2648463 - wizardry!
String.prototype.format = String.prototype.f = function() {
    var s = this,
        i = arguments.length;

    while (i--) {
        s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    }
    return s;
};

function load_hint_modal(method, hintid){
    $('#hint-modal-hint').val('');
    $('#hint-modal-cost').val('');
    if (method == 'create'){
        $('#hint-modal-submit').attr('action', '/admin/hints');
        $('#hint-modal-title').text('Create Hint');
        $("#hint-modal").modal();
    } else if (method == 'update'){
        $.get(script_root + '/admin/hints/' + hintid, function(data){
            $('#hint-modal-submit').attr('action', '/admin/hints/' + hintid);
            $('#hint-modal-hint').val(data.hint);
            $('#hint-modal-cost').val(data.cost);
            $('#hint-modal-title').text('Update Hint');
            $("#hint-modal-button").text('Update Hint');
            $("#hint-modal").modal();
        });
    }
}

function loaddiscoveryList(chal){
    $('#discoveryList-chal').val(chal)
    $('#current-discoveryList').empty()
    $('#chal-discoveryList').empty()
    $.get(script_root + '/admin/discoveryList/'+chal, function(data){
        discoveryList = $.parseJSON(JSON.stringify(data))
        discoveryList = discoveryList['discoveryList']
        for (var i = 0; i < discoveryList.length; i++) {
            discovery = "<span class='label label-primary chal-discovery'><span>"+discoveryList[i].discovery+"</span><a name='"+discoveryList[i].id+"'' class='delete-discovery'>&#215;</a></span>"
            $('#current-discoveryList').append(discovery)
        };
        $('.delete-discovery').click(function(e){
            deletediscovery(e.target.name)
            $(e.target).parent().remove()
        });
    });
}

function updatediscoveryList(){
    discoveryList = [];
    chal = $('#discoveryList-chal').val()
    console.log("Done!")
    console.log($('#chal-discoveryList > span'))
    console.log($('#chal-discoveryList'))
    $('#chal-discoveryList > span').each(function(i, e){
        discoveryList.push($(e).text())
    });
    $.post(script_root + '/admin/discoveryList/'+chal, {'discoveryList':discoveryList, 'nonce': $('#nonce').val()})
    loadchal(chal)
}

function deletediscovery(discoveryid){
    $.post(script_root + '/admin/discoveryList/'+discoveryid+'/delete', {'nonce': $('#nonce').val()});
    $(this).parent().remove()
}

$('#create-discovery').click(function(e){
    elem = builddiscovery();
    $('#current-discoveryList').append(elem);
});

var discovery_dropdown=-1

function builddiscovery(){
    var discoveryList = []
    
    $('.chal-title').each(function(){
        curChalNum = this.innerText
    });
    
    var elem = $('<div class="col-md-12 row current-discovery">');
    discovery_dropdown += 1
    var this_disc_drop_id = discovery_dropdown
    
    var buttons = $('<div class="btn-group disc-drop" role="group">');
    var dropdown = $('<div class="btn-group dropdown" role="group">');
    dropdown.append('<button class="btn btn-default dropdown-toggle" type="button" id="discovery_dropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"><span class="chal-quantity">0</span> Challenges<span class="chal-plural">s</span> <span class="caret"></span></button>');
    var options = $('<ul class="dropdown-menu" aria-labelledby="discovery_dropdown">');
    dropdown.append(options);
    buttons.append(dropdown);
    
    $('.chal-button').each(function(){
        if(this.firstChild.innerText != curChalNum){
            add_discovery = $('<li class="discovery-item"><a href="#"><span class="fa fa-square-o" aria-hidden="true"></span><span class="fa fa-check-square-o" aria-hidden="true"></span> '+'ID: '+$(this).val()+'| name: '+this.firstChild.innerText+'</a></li>');
            add_discovery.click(function(e){
                if($(this).hasClass('active')){
                    $(this).removeClass('active');
                    $(this).find('.fa-check-square-o').hide();
                    $(this).find('.fa-square-o').show();
                }
                else{
                    $(this).addClass('active');
                    $(this).find('.fa-check-square-o').show();
                    $(this).find('.fa-square-o').hide();
                }
                var numActive = $(this).parent().find(".active").length;
                
                discElem=[]
                discovery=[];
                for(var i = 0; i < numActive; ++ i){
                    var optionText = $(this).parent().find(".active")[i].innerText;
                    if(discElem.indexOf(optionText) == -1){
                        discElem.push(optionText);
                    }
                }
                $(discElem).each(function(){
                    discovery.push(parseInt(String(this.match(/(ID:\ )\d+/g)).replace(/(ID:\ )/g, '')))
                });
                discovery=discovery.join('&')
                
                if (discovery.length > 0){
                    if($(String('.disc'+this_disc_drop_id)).length == 0){
                        discovery = "<span class='label label-primary chal-discovery disc"+this_disc_drop_id+"'><span>"+discovery                   
                        $('#chal-discoveryList').append(discovery)
                        // $('#chal-discoveryList')[this_disc_drop_id] = discovery
                    } else{
                        $(String('.disc'+this_disc_drop_id))[0].innerText=discovery
                    }
                    $('.discovery-insert').val("")
                }
              
                $(this).parent().parent().find(".chal-quantity").text(numActive.toString());
                if(numActive == 1){
                    $(this).parent().parent().find(".chal-plural").html("&nbsp;");
                }
                else {
                    $(this).parent().parent().find(".chal-plural").html("s");
                }
                e.stopPropagation();
            })
            add_discovery.find('.fa-check-square-o').hide();
            var chalid = parseInt($(this).find('.chal-button').value);
            add_discovery.append($("<input class='chal-link' type='hidden'>").val(chalid));
            options.append(add_discovery);

            if($.inArray(chalid, discoveryList) > -1){
                add_discovery.click();
            }
        }
    });
    
    if(options.children().length == 0){
      options.append('<li>&nbsp; No other Problems</li>');
    }

    buttons.append('<a href="#" onclick="$(this).parent().parent().remove(); $(String(\'.disc'+String(this_disc_drop_id)+'\')).remove()" style="margin-right:-10px;" class="btn btn-danger pull-right discovery-remove-button">Remove</a>');
    elem.append(buttons);
        
    return elem;
}

$('#submit-discoveryList').click(function (e) {
    e.preventDefault();
    updatediscoveryList()
});

function submitkey(chal, key) {
    $.post(script_root + "/admin/chal/" + chal, {
        key: key,
        nonce: $('#nonce').val()
    }, function (data) {
        alert(data)
    })
}

function create_key(chal, key, key_type) {
    $.post(script_root + "/admin/keys", {
        chal: chal,
        key: key,
        key_type: key_type,
        nonce: $('#nonce').val()
    }, function (data) {
        if (data == "1"){
            loadkeys(chal);
            $("#create-keys").modal('toggle');
        }
    });
}

function loadkeys(chal){
    $.get(script_root + '/admin/chal/' + chal + '/keys', function(data){
        $('#keys-chal').val(chal);
        keys = $.parseJSON(JSON.stringify(data));
        keys = keys['keys'];
        $('#current-keys').empty();
        $.get(script_root + "/static/admin/js/templates/admin-keys-table.hbs", function(data){
            var template = Handlebars.compile(data);
            var wrapper  = {keys: keys, script_root: script_root};
            $('#current-keys').append(template(wrapper));
        });
    });
}

function updatekeys(){
    keys = [];
    vals = [];
    chal = $('#keys-chal').val()
    $('.current-key').each(function(){
        keys.push($(this).val());
    })
    $('#current-keys input[name*="key_type"]:checked').each(function(){
        vals.push($(this).val());
    })
    $.post(script_root + '/admin/keys/'+chal, {'keys':keys, 'vals':vals, 'nonce': $('#nonce').val()})
    loadchal(chal, true)
    $('#update-keys').modal('hide');
}


function deletekey(key_id){
    $.post(script_root + '/admin/keys/'+key_id+'/delete', {'nonce': $('#nonce').val()}, function(data){
        if (data == "1") {
            $('tr[name={0}]'.format(key_id)).remove();
        }
    });
}

function updatekey(){
    var key_id = $('#key-id').val();
    var chal = $('#keys-chal').val();
    var key_data = $('#key-data').val();
    var key_type = $('#key-type').val();
    var nonce = $('#nonce').val();
    $.post(script_root + '/admin/keys/'+key_id, {
        'chal':chal,
        'key':key_data,
        'key_type': key_type,
        'nonce': nonce
    }, function(data){
        if (data == "1") {
            loadkeys(chal);
            $('#edit-keys').modal('toggle');
        }
    })
}

function loadtags(chal){
    $('#tags-chal').val(chal)
    $('#current-tags').empty()
    $('#chal-tags').empty()
    $.get(script_root + '/admin/tags/'+chal, function(data){
        tags = $.parseJSON(JSON.stringify(data))
        tags = tags['tags']
        for (var i = 0; i < tags.length; i++) {
            tag = "<span class='label label-primary chal-tag'><span>"+tags[i].tag+"</span><a name='"+tags[i].id+"'' class='delete-tag'>&#215;</a></span>"
            $('#current-tags').append(tag)
        };
        $('.delete-tag').click(function(e){
            deletetag(e.target.name)
            $(e.target).parent().remove()
        });
    });
}

function deletetag(tagid){
    $.post(script_root + '/admin/tags/'+tagid+'/delete', {'nonce': $('#nonce').val()});
}


function edithint(hintid){
    $.get(script_root + '/admin/hints/' + hintid, function(data){
        console.log(data);
    })
}


function deletehint(hintid){
    $.delete(script_root + '/admin/hints/' + hintid, function(data, textStatus, jqXHR){
        if (jqXHR.status == 204){
            var chalid = $('.chal-id').val();
            loadhints(chalid);
        }
    });
}


function loadhints(chal){
    $.get(script_root + '/admin/chal/{0}/hints'.format(chal), function(data){
        var table = $('#hintsboard > tbody');
        table.empty();
        for (var i = 0; i < data.hints.length; i++) {
            var hint = data.hints[i]
            var hint_row = "<tr>" +
            "<td class='hint-entry'>{0}</td>".format(hint.hint) +
            "<td class='hint-cost'>{0}</td>".format(hint.cost) +
            "<td class='hint-settings'><span>" +
                "<i role='button' class='fa fa-pencil-square-o' onclick=javascript:load_hint_modal('update',{0})></i>".format(hint.id)+
                "<i role='button' class='fa fa-times' onclick=javascript:deletehint({0})></i>".format(hint.id)+
                "</span></td>" +
            "</tr>";
            table.append(hint_row);
        }
    });
}


function deletechal(chalid){
    $.post(script_root + '/admin/chal/delete', {'nonce':$('#nonce').val(), 'id':chalid});
}

function updatetags(){
    tags = [];
    chal = $('#tags-chal').val()
    $('#chal-tags > span > span').each(function(i, e){
        tags.push($(e).text())
    });
    $.post(script_root + '/admin/tags/'+chal, {'tags':tags, 'nonce': $('#nonce').val()})
    loadchal(chal)
}

function updatefiles(){
    chal = $('#files-chal').val();
    var form = $('#update-files form')[0];
    var formData = new FormData(form);
    $.ajax({
        url: script_root + '/admin/files/'+chal,
        data: formData,
        type: 'POST',
        cache: false,
        contentType: false,
        processData: false,
        success: function(data){
            form.reset();
            loadfiles(chal);
            $('#update-files').modal('hide');
        }
    });
}

function loadfiles(chal){
    $('#update-files form').attr('action', script_root+'/admin/files/'+chal)
    $.get(script_root + '/admin/files/' + chal, function(data){
        $('#files-chal').val(chal)
        files = $.parseJSON(JSON.stringify(data));
        files = files['files']
        $('#current-files').empty()
        for(x=0; x<files.length; x++){
            filename = files[x].file.split('/')
            filename = filename[filename.length - 1]
            $('#current-files').append('<div class="row" style="margin:5px 0px;">'+'<a style="position:relative;top:10px;" href='+script_root+'/files/'+files[x].file+'>'+filename+'</a><a href="#" class="btn btn-danger" onclick="deletefile('+chal+','+files[x].id+', $(this))" value="'+files[x].id+'" style="float:right;">Delete</a></div>')
        }
    });
}

function deletefile(chal, file, elem){
    $.post(script_root + '/admin/files/' + chal,{
        'nonce': $('#nonce').val(),
        'method': 'delete',
        'file': file
    }, function (data){
        if (data == "1") {
            elem.parent().remove()
        }
    });
}

$('#submit-key').click(function (e) {
    submitkey($('#chalid').val(), $('#answer').val())
});

$('#submit-keys').click(function (e) {
    e.preventDefault();
    $('#update-keys').modal('hide');
});

$('#submit-tags').click(function (e) {
    e.preventDefault();
    updatetags()
});

$('#submit-files').click(function (e) {
    e.preventDefault();
    updatefiles()
});

$('#delete-chal form').submit(function(e){
    e.preventDefault();
    $.post(script_root + '/admin/chal/delete', $(this).serialize(), function(data){
        console.log(data)
        if (data){
            loadchals();
        }
        else {
            alert('There was an error');
        }
    })
    $("#delete-chal").modal("hide");
    $("#update-challenge").modal("hide");
});

$(".tag-insert").keyup(function (e) {
    if (e.keyCode == 13) {
        tag = $('.tag-insert').val()
        tag = tag.replace(/'/g, '');
        if (tag.length > 0){
            tag = "<span class='label label-primary chal-tag'><span>"+tag+"</span><a class='delete-tag' onclick='$(this).parent().remove()'>&#215;</a></span>"
            $('#chal-tags').append(tag)
        }
        $('.tag-insert').val("")
    }
});

$('#limit_max_attempts').change(function() {
    if(this.checked) {
        $('#chal-attempts-group').show();
    } else {
        $('#chal-attempts-group').hide();
        $('#chal-attempts-input').val('');
    }
});

// Markdown Preview
$('#desc-edit').on('shown.bs.tab', function (event) {
    if (event.target.hash == '#desc-preview'){
        $(event.target.hash).html(marked($('#desc-editor').val(), {'gfm':true, 'breaks':true}))
    }
});
$('#new-desc-edit').on('shown.bs.tab', function (event) {
    if (event.target.hash == '#new-desc-preview'){
        $(event.target.hash).html(marked($('#new-desc-editor').val(), {'gfm':true, 'breaks':true}))
    }
});

// Open New Challenge modal when New Challenge button is clicked
// $('.create-challenge').click(function (e) {
//     $('#create-challenge').modal();
// });


$('#create-key').click(function(e){
    $.get(script_root + '/admin/key_types', function(data){
        $("#create-keys-select").empty();
        var option = "<option> -- </option>";
        $("#create-keys-select").append(option);
        for (var key in data){
            var option = "<option value='{0}'>{1}</option>".format(key, data[key]);
            $("#create-keys-select").append(option);
        }
        $("#create-keys").modal();
    });
});

$('#create-keys-select').change(function(){
    var key_type_name = $(this).find("option:selected").text();

    $.get(script_root + '/static/admin/js/templates/keys/'+key_type_name +'/'+key_type_name+'.hbs', function(template_data){
        var template = Handlebars.compile(template_data);
        $("#create-keys-entry-div").html(template());
        $("#create-keys-button-div").show();
    });
});


$('#create-keys-submit').click(function (e) {
    e.preventDefault();
    var chalid = $('#create-keys').find('.chal-id').val();
    var key_data = $('#create-keys').find('input[name=key]').val();
    var key_type = $('#create-keys-select').val();
    create_key(chalid, key_data, key_type);
});


$('#create-hint').click(function(e){
    e.preventDefault();
    load_hint_modal('create');
});

$('#hint-modal-submit').submit(function (e) {
    e.preventDefault();
    var params = {}
    $(this).serializeArray().map(function(x){
        params[x.name] = x.value;
    });
    $.post(script_root + $(this).attr('action'), params, function(data){
        loadhints(params['chal']);
    });
    $("#hint-modal").modal('hide');
});

function loadchal(id, update) {
    // $('#chal *').show()
    // $('#chal > h1').hide()
    obj = $.grep(challenges['game'], function (e) {
        return e.id == id;
    })[0]
    $('#desc-write-link').click() // Switch to Write tab
    $('.chal-title').text(obj.name);
    $('.chal-name').val(obj.name);
    $('.chal-desc').val(obj.description);
    $('.chal-value').val(obj.value);
    if (parseInt(obj.max_attempts) > 0){
        $('.chal-attempts').val(obj.max_attempts);
        $('#limit_max_attempts').prop('checked', true);
        $('#chal-attempts-group').show();
    }
    $('.chal-category').val(obj.category);
    $('.chal-id').val(obj.id);
    $('.chal-hidden').prop('checked', false);
    if (obj.hidden) {
        $('.chal-hidden').prop('checked', true);
    }
    //$('#update-challenge .chal-delete').attr({
    //    'href': '/admin/chal/close/' + (id + 1)
    //})
    if (typeof update === 'undefined')
        $('#update-challenge').modal();
}

function openchal(id){
    loadchal(id);
    loadkeys(id);
    loadhints(id);
    loadtags(id);
    loadfiles(id);
    loaddiscoveryList(id);
}
 
