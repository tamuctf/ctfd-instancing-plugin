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
            var elem = buildfile(files[x].file, files[x].id, chal);
            $('#current-files').append(elem);
        }
        loadinstances(chal); //Instances need to load after files
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

function loadinstances(chal){
    $.get(script_root + '/admin/instances/' + chal, function(data){
        $('#instances-chal').val(chal);
        instances = $.parseJSON(JSON.stringify(data));
        instances = instances['instances'];
        $('#current-instances').empty();
        for(x=0; x<instances.length; x++){
            var elem = buildinstance(instances[x]);
            $('#current-instances').append(elem);
        }
        setSubmitInstBtnStatus()
    });
}

function updateinstances(){
    var instances = [];
    chal = $('#instances-chal').val()
    $('.current-instance').each(function(){
        var inst = {};
        var filemappings = [];
        $(this).find('.filemapping-item.active').each(function(){
            var fileid = $(this).find('.file-id').val();
            filemappings.push(fileid);
        });
        inst["params"] = $(this).find(".instance-params").val();
        inst["filemappings"] = filemappings;
        inst["id"] = $(this).find(".instance-id").val();
        instances.push(JSON.stringify(inst));
    })
    $.post(script_root + '/admin/instances/'+chal, {'instances':instances, 'nonce': $('#nonce').val()})
    loadchal(chal, true)
    $('#update-instances').modal('hide');
    loadinstances(chal); // Ensure that the new IDs generated by the DB are loaded
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

$('#submit-instances').click(function (e) {
    e.preventDefault();
    updateinstances();
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

$('#create-instance').click(function(e){
    elem = buildinstance();
    $('#current-instances').append(elem);
    setSubmitInstBtnStatus()
});

function update_instance_ctrls(){
    if($('.chal-instanced').is(":checked")){  
        $(".instance-ctrl").show();
    }
    else {
        $(".instance-ctrl").hide();
    }
}

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
    if(!update){
        if (obj.hidden) {
            $('.chal-hidden').prop('checked', true);
        }
        $('.chal-instanced').prop('checked', false);
        if (obj.instanced) {
            $('.chal-instanced').prop('checked', true);
        }
        update_instance_ctrls();
    }
    //$('#update-challenge .chal-delete').attr({
    //    'href': '/admin/chal/close/' + (id + 1)
    //})
    if (typeof update === 'undefined')
        $('#update-challenge').modal();
}

function buildfile(filepath, id, chal){
    filename = filepath.split('/')
    filename = filename[filename.length - 1]
    var elem = $('<div class="row current-file" style="margin:5px 0px;">');
    elem.append('<a class="file-link" style="position:relative;top:10px;" href='+script_root+'/files/'+filepath+'>'+filename+'</a>');

    var form_group = $('<div class="form-group" style="float: right">');
    form_group.append('<a href="#" class="btn btn-danger" onclick="deletefile('+chal+','+id+', $(this))" value="'+id+'" style="float:right;">Delete</a>');
    elem.append(form_group);
    elem.append($("<input class='file-id' type='hidden'>").val(id));
    return elem;
}

function setSubmitInstBtnStatus(){
    var isValid = true;
    var failureIndices = [];
    $(".params-input-group").each(function(i){
        if($(this).hasClass("has-error")){
            isValid = false;
            failureIndices.push(i);
        }
    });
    if(isValid){
        $("#submit-instances").removeClass("disabled");
        $("#submit-instances").css("pointer-events", "auto");
        $("#instance-error-notification").slideUp();
    }
    else{
        $("#submit-instances").addClass("disabled");
        $("#submit-instances").css("pointer-events", "none");
        $("#instance-error-notification").slideDown();
        $("#instance-error-message").text("Invalid JSON object strings in the following instance indices: " + failureIndices.toString());
    }
    return isValid;
}

function buildinstance(instance=null){
    var instid = 0;
    var params = "";
    var filemappings = [];
    if(instance===null){
        instid = -1; // Negative instid indicates that this instance is new and needs an id. This id must eb unique
        $('.current-instance').each(function(){
            var x = parseInt($(this).find('.instance-id').val());
            if(x <= instid){
                instid = x-1;
            }
        }); 
    }
    else{
        instid = instance.id;
        params = instance.params;
        filemappings = instance.filemappings;
    }
    var elem = $('<div class="col-md-12 row current-instance">');
    
    var textbox = $("<div class='params-input-group form-group has-feedback col-md-7' >");
    textbox.append($("<textarea class='instance-params form-control' style='resize:vertical' placeholder='Template parameters (JSON object)'>").val(params))
    //textbox.append($('<span class="form-control-feedback fa fa-exclamation-triangle" aria-hidden="true">'));
    textbox.append($("<input class='instance-id' type='hidden'>").val(instid));
    elem.append(textbox)
    
    // Callback to check params validity
    textbox.change(function(e){
        var isJSON = false;
        var params = $(this).find('.instance-params').val();
        try{
            var o = JSON.parse(params);

            if(o && typeof o == "object") {
                isJSON = true;
            }
        }
        catch(e) { }
        if(isJSON){
            $(this).removeClass("has-error");
        }
        else{
            $(this).addClass("has-error");
        }
        setSubmitInstBtnStatus()
    });
    textbox.change();

    var buttons = $('<div class="btn-group col-md-5" role="group">');
    var dropdown = $('<div class="btn-group dropdown" role="group">');
    dropdown.append('<button class="btn btn-default dropdown-toggle" type="button" id="filemapping_dropdown" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"><span class="file-quantity">0</span> File<span class="file-plural">s</span> <span class="caret"></span></button>');
    var options = $('<ul class="dropdown-menu" aria-labelledby="filemapping_dropdown">');
    dropdown.append(options);
    buttons.append(dropdown);

    $('.current-file').each(function(){
        filename_btn = $('<li class="filemapping-item"><a href="#"><span class="fa fa-square-o" aria-hidden="true"></span><span class="fa fa-check-square-o" aria-hidden="true"></span> '+$(this).find('.file-link').text()+'</a></li>');
        filename_btn.click(function(e){
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
            $(this).parent().parent().find(".file-quantity").text(numActive.toString());
            if(numActive == 1){
                $(this).parent().parent().find(".file-plural").html("&nbsp;");
            }
            else {
                $(this).parent().parent().find(".file-plural").html("s");
            }
            e.stopPropagation();
        })
        filename_btn.find('.fa-check-square-o').hide();

        var fileid = parseInt($(this).find('.file-id').val());
        filename_btn.append($("<input class='file-id' type='hidden'>").val(fileid));
        options.append(filename_btn);

        if($.inArray(fileid, filemappings) > -1){
            filename_btn.click();
        }
    });
    if(options.children().length == 0){
        options.append('<li>&nbsp; No files uploaded</li>');
    }

    buttons.append('<a href="#" onclick="$(this).parent().parent().remove(); setSubmitInstBtnStatus()" style="margin-right:-10px;" class="btn btn-danger pull-right instance-remove-button">Remove</a>');
    elem.append(buttons);
    return elem;
}

function openchal(id){
    loadchal(id);
    loadkeys(id);
    loadhints(id);
    loadtags(id);
    loadfiles(id);
}
