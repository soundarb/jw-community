PropertyEditor = {};
PropertyEditor.Model = {};
PropertyEditor.Type = {};
PropertyEditor.Validator = {};

/* Utility Functions */
PropertyEditor.Util = {
    ajaxCalls: {},
    types: {},
    validators: {},
    escapeHtmlTag: function(string){
        string = String(string);
        
        var regX = /&/g;
        var replaceString = '&amp;';
        string = string.replace(regX, replaceString);
        
        var regX = /</g;
        var replaceString = '&lt;';
        string = string.replace(regX, replaceString);

        regX = />/g;
        replaceString = '&gt;';
        string = string.replace(regX, replaceString);

        regX = /"/g;
        replaceString = '&quot;';
        return string.replace(regX, replaceString);
    },
    deepEquals: function (o1, o2) {
        var aProps = Object.getOwnPropertyNames(o1);
        var bProps = Object.getOwnPropertyNames(o2);
        
        if (aProps.length !== bProps.length) {
            return false;
        }

        for (var i = 0; i < aProps.length; i++) {
            var propName = aProps[i];
            if (typeof o1[propName] === "object") {
                if (!PropertyEditor.Util.deepEquals(o1[propName], o2[propName])) {
                    return false;
                }
            } else if (o1[propName] !== o2[propName]) {
                return false;
            }
        }
        
        return true;
    },
    inherit: function (base, methods) {  
        var sub = function() {
            base.apply(this, arguments); // Call base class constructor
            // Call sub class initialize method that will act like a constructor
            this.initialize.apply(this);
        };
        
        sub.prototype = Object.create(base.prototype);
        $.extend(sub.prototype, methods);
        
        //register types and validators
        if (base === PropertyEditor.Model.Type) {
            PropertyEditor.Util.types[methods.shortname.toLowerCase()] = sub;
        } else if (base === PropertyEditor.Model.Validator) {
            PropertyEditor.Util.validators[methods.shortname.toLowerCase()] = sub;
        }
        
        return sub;
    },
    nl2br: function(string){
        string = PropertyEditor.Util.escapeHtmlTag(string);
        var regX = /\n/g;
        var replaceString = '<br/>';
        return string.replace(regX, replaceString);
    },
    getFunction: function(name) {
        try {
            var parts = name.split(".");
            var func = null;
            if (parts[0] !== undefined && parts[0] !== "") {
                func = window[parts[0]];
            }
            if (parts.length > 1) {
                for (var i = 1; i < parts.length; i ++) {
                    func = func[parts[i]];
                }
            }
            
            return func;
        } catch (err) {};
        return null;
    },
    retrieveOptionsFromCallback: function(properties) {
        try {
            if (properties.options_callback !== undefined && properties.options_callback !== null && properties.options_callback !== "" ) {
                var func = PropertyEditor.Util.getFunction(properties.options_callback);
                if ($.isFunction(func)) {
                    var options = func(properties);
                    if (options !== null) {
                        properties.options = options;
                    }
                }
            } else if (properties.options_script !== undefined && properties.options_script !== null && properties.options_script !== "" ) {
                try {
                    var options = eval(properties.options_script);
                    if (options !== null) {
                        properties.options = options;
                    }
                }catch (e) {}
            }
            if (properties.options_extra !== undefined && properties.options_extra !== null) {
                var options = properties.options_extra;
                if (properties.options !== undefined) {
                    properties.options = options.concat(properties.options);
                } else {
                    properties.options = options;
                }
            }
        } catch (err) {};
    },
    replaceContextPath: function (string, contextPath){
        if(string === null){
            return string;
        }
        var regX = /\[CONTEXT_PATH\]/g;
        return string.replace(regX, contextPath);
    },
    getTypeObject: function(page, number, prefix, properties, value, defaultValue) {
        var type = properties.type.toLowerCase();
        var object = new PropertyEditor.Util.types[type](page, number, prefix, properties, value, defaultValue);
        return object;
    },
    getValidatorObject: function(page, properties) {
        var type = properties.type.toLowerCase();
        var object = new PropertyEditor.Util.validators[type](page, properties);
        return object;
    },
    uuid: function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        }).toUpperCase();
    },
    handleDynamicOptionsField: function (page) {
        if (page !== null && page !== undefined) {
            var pageContainer = $(page.editor).find("#"+page.id);
            if ($(pageContainer).is("[data-control_field][data-control_value]")) {
                PropertyEditor.Util.bindDynamicOptionsEvent($(pageContainer), page);
            }
            $(pageContainer).find("[data-control_field][data-control_value]").each(function() {
                PropertyEditor.Util.bindDynamicOptionsEvent($(this), page);
            });
        }
    },
    bindDynamicOptionsEvent : function(element, page) {
        var control_field = element.data("control_field");
        var controlVal = String(element.data("control_value"));
        var isRegex = element.data("control_use_regex");

        var field = page.editorObject.fields[control_field];
        if (field !== null && field !== undefined) {
            var control = $(field.editor).find("#" + field.id);
            control.on("change", function() {
                var match  = PropertyEditor.Util.dynamicOptionsCheckValue(field, controlVal, isRegex);
                if (match) {
                    element.show();
                    element.find("input, select, textarea, table").removeClass("hidden");
                    element.removeClass("hidden");
                    if (element.hasClass("property-editor-page")) {
                        element.removeClass("property-page-hide");
                        element.addClass("property-page-show");
                    }
                } else {
                    element.hide();
                    element.find("input, select, textarea, table").addClass("hidden");
                    element.addClass("hidden");
                    if (element.hasClass("property-editor-page")) {
                        element.addClass("property-page-hide");
                        element.removeClass("property-page-show");
                    }
                }
                element.find("input, select, textarea, table").trigger("change");
                if (page.properties.properties !== undefined){
                    $.each(page.properties.properties, function(i, property){
                        var type = property.propertyEditorObject;
                        if (element.find("[name='"+type.id+"']").length > 0) {
                            type.pageShown();
                        }
                    });
                }
                
                if (element.hasClass("property-editor-page")) {
                    var current = $(page.editor).find('.property-page-show.current');
                    if ($(current).length > 0) {
                        var pageId = $(current).attr("id");
                        page.editorObject.pages[pageId].refreshStepsIndicator();
                        page.editorObject.pages[pageId].buttonPanel.refresh();
                    }
                }
            });  
            control.trigger("change");
        }
    },
    handleOptionsField: function (field, reference, ajax_url, on_change, mapping, method, extra) {
        if (field !== null && field !== undefined && (ajax_url === undefined || ajax_url === null)) {
            ajax_url = field.properties.options_ajax;
        }
        if (field !== null && field !== undefined && (on_change === undefined || on_change === null)) {
            on_change = field.properties.options_ajax_on_change;
        }
        if (field !== null && field !== undefined && (mapping === undefined || mapping === null)) {
            mapping = field.properties.options_ajax_mapping;
        }
        if (field !== null && field !== undefined && (method === undefined || method === null)) {
            method = field.properties.options_ajax_method;
        }
        if (field !== null && field !== undefined && (extra === undefined || extra === null)) {
            extra = field.properties.options_extra;
        }
        if (field !== null && field !== undefined && ajax_url !== undefined && ajax_url !== null) {
            field.isDataReady = false;
            PropertyEditor.Util.callLoadOptionsAjax(field, reference, ajax_url, on_change, mapping, method, extra);
            if(on_change !== undefined && on_change !== null){
                PropertyEditor.Util.fieldOnChange(field, reference, ajax_url, on_change, mapping, method, extra);
            }
        }
    },
    callLoadOptionsAjax: function (field, reference, ajax_url, on_change, mapping, method, extra) {
        var ajaxUrl = PropertyEditor.Util.replaceContextPath(ajax_url, field.options.contextPath);
        if(on_change !== undefined && on_change !== null){
            var onChanges = on_change.split(";");
            for (var i in onChanges) {
                var fieldId = onChanges[i];
                var param = fieldId;
                var childField = "";
                if (fieldId.indexOf(":") !== -1) {
                    param = fieldId.substring(0, fieldId.indexOf(":"));
                    fieldId = fieldId.substring(fieldId.indexOf(":") + 1);
                }
                if (fieldId.indexOf(".") !== -1) {
                    childField = fieldId.substring(fieldId.indexOf(".") + 1);
                    fieldId = fieldId.substring(0, fieldId.indexOf("."));
                }
                
                if(ajaxUrl.indexOf('?') !== -1){
                    ajaxUrl += "&";
                }else{
                    ajaxUrl += "?";
                }
                
                var targetField = field.editorObject.fields[fieldId];
                var data = targetField.getData(true);
                var targetValue = data[fieldId];
                
                if (childField !== "" ) {
                    if ($.isArray(targetValue)) { //is grid
                        var values = [];
                        for (var j in targetValue) {
                            values.push(targetValue[j][childField]);
                        }
                        targetValue = values.join(";");
                    } else {
                        if (targetValue === null || targetValue[childField] === null || targetValue[childField] === undefined) {
                            targetValue = "";
                        } else if ($.type(targetValue[childField]) === "string") {
                            targetValue = targetValue[childField];
                        } else {
                            targetValue = JSON.encode(targetValue[childField]);
                        }
                    }
                } else if(targetValue === null || targetValue === undefined){
                    targetValue = "";
                }
                
                ajaxUrl += param + "=" + escape(targetValue);
            }
        }
        if (PropertyEditor.Util.ajaxCalls[ajaxUrl] === undefined || PropertyEditor.Util.ajaxCalls[ajaxUrl] === null) {
            PropertyEditor.Util.ajaxCalls[ajaxUrl] = [];
        }
        
        PropertyEditor.Util.ajaxCalls[ajaxUrl].push({
            field : field,
            mapping : mapping,
            reference : reference
        });
        
        if (PropertyEditor.Util.ajaxCalls[ajaxUrl].length === 1) {
            if (method === undefined || method.toUpperCase() !== "POST") {
                method = "GET";
            }
            
            $.ajax({
                url: ajaxUrl,
                dataType: "text",
                method: method.toUpperCase(),
                success: function(data) {
                    if(data !== undefined && data !== null){
                        var options = $.parseJSON(data);
                        var calls = PropertyEditor.Util.ajaxCalls[ajaxUrl];
                        for (var i in calls) {
                            var tempOptions = options;
                            
                            if (calls[i].mapping !== undefined) {
                                if (calls[i].mapping.arrayObj !== undefined) {
                                    tempOptions = PropertyEditor.Util.getValueFromObject(tempOptions, calls[i].mapping.arrayObj);
                                }
                                
                                var newOptions = [];
                                calls[i].mapping.addEmpty = true;
                                if (calls[i].mapping.addEmpty !== undefined && calls[i].mapping.addEmpty) {
                                    newOptions.push({value:'', label:''});
                                }
                                
                                for (var o in tempOptions) {
                                    if (calls[i].mapping.value !== undefined && calls[i].mapping.label !== undefined) {
                                        newOptions.push({
                                            value: PropertyEditor.Util.getValueFromObject(tempOptions[o], calls[i].mapping.value), 
                                            label: PropertyEditor.Util.getValueFromObject(tempOptions[o], calls[i].mapping.label)
                                        });
                                    } else {
                                        newOptions.push(tempOptions[o]);
                                    }
                                }
                                tempOptions = newOptions;
                            }
                            
                            if (extra !== undefined && extra !== null) {
                                if (tempOptions !== undefined) {
                                    tempOptions = extra.concat(tempOptions);
                                } else {
                                    tempOptions = extra;
                                }
                            }

                            calls[i].field.handleAjaxOptions(tempOptions, calls[i].reference);
                            calls[i].field.isDataReady = true;
                        }
                        delete PropertyEditor.Util.ajaxCalls[ajaxUrl];
                    }
                }
            });
        }
    },
    fieldOnChange: function (field, reference, ajax_url, on_change, mapping, method) {
        var onChanges = on_change.split(";");
        var fieldIds = [];
        for (var i in onChanges) {
            var fieldId = onChanges[i];
            if (fieldId.indexOf(":") !== -1) {
                fieldId = fieldId.substring(fieldId.indexOf(":") + 1);
            }
            if (fieldId.indexOf(".") !== -1) {
                fieldId = fieldId.substring(0, fieldId.indexOf("."));
            }
            if ($.inArray(fieldId, fieldIds) === -1) {
                fieldIds.push(fieldId);
            }
        }
        for (var i in fieldIds) {
            var targetEl = $(field.editor).find("#" + field.editorObject.fields[fieldIds[i]].id);
            targetEl.on("change", function() {
                PropertyEditor.Util.callLoadOptionsAjax(field, reference, ajax_url, on_change, mapping, method);
            });
        }
    },
    getValueFromObject: function (obj, name) {
        if ($.type(obj) === "string") {
            return obj;
        }
        
        try {
            var parts = name.split(".");
            var value = null;
            if (parts[0] !== undefined && parts[0] !== "") {
                value = obj[parts[0]];
            }
            if (parts.length > 1) {
                for (var i = 1; i < parts.length; i ++) {
                    value = value[parts[i]];
                }
            }
            
            return value;
        } catch (err) {};
        return null;
    },
    dynamicOptionsCheckValue: function (control, controlVal, isRegex) {
        if (control.isHidden()) {
            return false;
        }
        
        var values = new Array();
        
        var data = control.getData(true);
        var value = data[control.properties.name];
        
        if (value !== undefined && value !== null) {
            values = value.split(";");
        }
        
        if (values.length === 0) {
            values.push("");
        }
        
        for (var i = 0; i < values.length; i++) {
            if (isRegex !== undefined && isRegex) {
                var regex = new RegExp(controlVal);
                var result = regex.exec(values[i]);
                if($.isArray(result)) {
                    if (result.indexOf(values[i]) !== -1) {
                        return true;
                    }
                } else {
                    if (result === values[i]) {
                        return true;
                    }
                }
            } else {
                if (values[i] === controlVal) {
                    return true;
                }
            }
        }
        
        return false;
    },
    supportHashField: function(field) {
        if (field.properties.supportHash !== undefined && field.properties.supportHash.toLowerCase() === "true") {
            var propertyInput = $("#"+field.id + "_input");
            propertyInput.append('<div class="hashField"><input type="text" id="'+ field.id + '_hash" name="'+ field.id + '_hash" size="50" value="'+ PropertyEditor.Util.escapeHtmlTag(field.value) +'"/></div>');
            propertyInput.append("<a class=\"hashFieldAction\"><i class=\"icon-chevron-left\"></i><span>#</span><i class=\"icon-chevron-right\"></i></a>");

            if ($(propertyInput).find(".default").length > 0) {
                propertyInput.append($(propertyInput).find(".default"));
            }

            var toogleHashField = function() {
                if ($(propertyInput).hasClass("hash")) {
                    $(propertyInput).removeClass("hash");
                    $(propertyInput).find(".hashFieldAction").html("<i class=\"icon-chevron-left\"></i><span>#</span><i class=\"icon-chevron-right\"></i>");
                } else {
                    $(propertyInput).addClass("hash");
                    $(propertyInput).find(".hashFieldAction").html("<i class=\"icon-share-alt\"></i>");
                }
            };

            if (field.options.propertyValues !== undefined && field.options.propertyValues !== null) {
                var hashFields = field.options.propertyValues['PROPERTIES_EDITOR_METAS_HASH_FIELD'];
                if (hashFields !== undefined && hashFields !== "") {
                    var hfs = hashFields.split(";");
                    for (var i in hfs) {
                        if (field.properties.name === hfs[i]) {
                            toogleHashField();
                            break;
                        }
                    }
                }

            }

            $(propertyInput).find(".hashFieldAction").on("click", toogleHashField);
        }
    },
    retrieveHashFieldValue: function(field, data) {
        if (field.properties.supportHash !== undefined && field.properties.supportHash.toLowerCase() === "true") {
            var propertyInput = $("#"+field.id + "_input");
            if ($(propertyInput).hasClass("hash")) {
                var value = $('[name="'+field.id+'_hash"]:not(.hidden)').val();
                if (value === undefined || value === null || value === "") {
                    value = "";
                }
                value = value.trim();
                data[field.properties.name] = value;
                data['HASH_FIELD'] = field.properties.name;
            }
        }
    }
};
        
PropertyEditor.Model.Editor = function(element, options) {
    this.element = element;
    this.options = options;
    this.pages = {};
    this.fields = {};
    this.editorId = 'property_' + PropertyEditor.Util.uuid();
    
    $(this.element).append('<div id="' + this.editorId + '" class="property-editor-container" style="position:relative;"><div class="property-editor-display" ><a class="compress" title="'+get_peditor_msg('peditor.compress')+'"><i class="fa fa-compress" aria-hidden="true"></i></a><a class="expand" title="'+get_peditor_msg('peditor.expand')+'"><i class="fa fa-expand" aria-hidden="true"></i></a></div><div class="property-editor-nav"></div><div class="property-editor-pages"></div><div class="property-editor-buttons"></div><div>');
    this.editor = $(this.element).find('div#'+this.editorId);    
};
PropertyEditor.Model.Editor.prototype = {
    getData: function() {
        var properties = new Object();
        if(this.options.propertiesDefinition !== undefined && this.options.propertiesDefinition !== null){
            $.each(this.options.propertiesDefinition, function(i, page){
                var p = page.propertyEditorObject;
                properties = $.extend(properties, p.getData());
            });
        }
        return properties;
    },
    validation: function(successCallaback, failureCallback) {
        var errors = new Array();
        var data = this.getData();
        var deferreds = [];
        
        if(this.options.propertiesDefinition !== undefined && this.options.propertiesDefinition !== null){
            $.each(this.options.propertiesDefinition, function(i, page){
                var p = page.propertyEditorObject;
                var deffers = p.validate(data, errors, true);
                if (deffers !== null && deffers !== undefined && deffers.length > 0) {
                    deferreds = $.merge(deferreds, deffers);
                }
            });
        } else {
            var dummy = $.Deferred();
            deferreds.push(dummy);
            dummy.resolve();
        }
        
        $.when.apply($, deferreds).then(function(){
            if (errors.length > 0) {
                failureCallback(errors);
            } else {
                successCallaback(data);
            }
        });
    },
    render: function() {
        var html = '' ;
        if(this.options.propertiesDefinition === undefined || this.options.propertiesDefinition === null){
            html += this.renderNoPropertyPage();
        }else{
            var editorObject = this;
            $.each(this.options.propertiesDefinition, function(i, page){
                var p = page.propertyEditorObject;
                if (p === undefined) {        
                    p = new PropertyEditor.Model.Page(editorObject, i, page);
                    page.propertyEditorObject = p;
                    editorObject.pages[p.id] = p;
                }
                html += p.render();
            });
        }
        html += '<div class="property-editor-page-buffer"></div>';
        $(this.editor).find(".property-editor-pages").append(html);
        
        this.initScripting();
    },
    renderNoPropertyPage: function() {
        var p = new PropertyEditor.Model.Page(this, 'no_property', {title:get_peditor_msg('peditor.noProperties')});
        this.pages[p.id] = p;
        
        this.options.propertiesDefinition = new Array();
        this.options.propertiesDefinition.push({
            'propertyEditorObject' : p
        });
        
        return p.render();
    },
    initScripting: function() {
        var thisObject = this;
        
        if(this.options.propertiesDefinition !== undefined && this.options.propertiesDefinition !== null){
            $.each(this.options.propertiesDefinition, function(i, page){
                var p = page.propertyEditorObject;
                p.initScripting();
            });
        }
        
        this.adjustSize();
        this.initPage();
        
        if (this.options.showCancelButton) {
            $(this.editor).keydown(function(e){
                if (e.which === 27 && $(".property_editor_hashassit").length === 0) {
                    if (thisObject.isChange()) {
                        if (confirm(get_peditor_msg('peditor.confirmClose'))) {
                            thisObject.cancel();
                        }
                    } else {
                        thisObject.cancel();
                    }
                }
            });
        }
    },
    adjustSize: function() {
        //adjust height & width
        var tempHeight = $(window).height();
        if ($(this.element).hasClass("boxy-content")) {
            $(this.editor).css("width", ($(window).width() * 0.8) + "px");
            tempHeight = tempHeight  * 0.85;
        } else if ($(this.element).parent().attr('id') === "main-body-content") {
            $(this.editor).css("width", "auto");
            tempHeight = tempHeight - $(this.element).offset().top;
        } else {
            $(this.editor).css("width", "auto");
            tempHeight = tempHeight  * 0.9 - $(this.element).offset().top;
        }
        $(this.editor).css("height", (tempHeight  - 25) + "px");
        $(this.editor).find(".property-editor-property-container").css("height", (tempHeight - 140) + "px");
    },
    initPage: function() {
        var $thisObject = this;
        
        var pageContainer = $(this.editor).find('.property-editor-pages');
        $(pageContainer).scroll(function() {
            if ($thisObject.isSinglePageDisplay()) {
                var pageLine = $(pageContainer).offset().top + ($(pageContainer).height() * 0.4);
                var currentOffset = $(pageContainer).find('.current').offset().top;
                var nextOffset = currentOffset + $(pageContainer).find('.current').height();
                if (nextOffset < pageLine) {
                    $thisObject.nextPage(false);
                } else if (currentOffset > pageLine) {
                    $thisObject.prevPage(false);
                }
            }
        });
        
        this.initDisplayMode();
        
        this.changePage(null, $(this.editor).find('.property-page-show:first').attr("id"));
    },
    initDisplayMode: function() {
        var $thisObject = this;
        
        //init display mode based on cookies value
        var single = $.localStorage.getItem("propertyEditor.singlePageDisplay");
        if (single === "true") {
            this.toggleSinglePageDisplay(true);
        }
        
        $(this.editor).find('.property-editor-display a').click(function(){
            $thisObject.toggleSinglePageDisplay();
        });
    },
    toggleSinglePageDisplay: function(single) {
        if (single || !this.isSinglePageDisplay()) {
            $(this.editor).addClass("single-page");
            single = true;
            if ($(this.editor).find('.property-page-show.current').length > 0) {
                this.changePageCallback($(this.editor).find('.property-page-show.current').attr("id"), false);
            }
        } else {
            $(this.editor).removeClass("single-page");
            single = false;
        }
        
        //store display mode to cookies
        $.localStorage.setItem("propertyEditor.singlePageDisplay", single+"");
    },
    isSinglePageDisplay: function() {
        return $(this.editor).hasClass("single-page");
    }, 
    nextPage: function(scroll) {
        if ($(this.editor).find('.property-page-show.current').length > 0) {
            var current = $(this.editor).find('.property-page-show.current');
            var next = $(current).next();
            while(!$(next).hasClass("property-page-show") && $(next).hasClass("property-editor-page")){
                next = $(next).next();
            }
            if ($(next).hasClass("property-editor-page")) {
                this.changePage($(current).attr('id'), $(next).attr('id'), scroll);
            }
        }
    },
    prevPage: function(scroll) {
        if ($(this.editor).find('.property-page-show.current').length > 0) {
            var current = $(this.editor).find('.property-page-show.current');
            var prev = $(current).prev();
            while(!$(prev).hasClass("property-page-show") && $(prev).hasClass("property-editor-page")){
                prev = $(prev).next();
            }
            if ($(prev).hasClass("property-editor-page")) {
                this.changePage($(current).attr('id'), $(prev).attr('id'), scroll);
            }
        }
    },
    changePage: function(currentPageId, pageId, scroll) {
        var thisObject = this;
        if (currentPageId !== null && currentPageId !== undefined) {
            this.pages[currentPageId].validation(function(data){
                thisObject.changePageCallback(pageId, scroll);
            }, thisObject.alertValidationErrors);
        } else {
            this.changePageCallback(pageId, scroll);
        }
    },
    changePageCallback: function (pageId, scroll) {
        //trigger change if the current page is property page of an element
        var elementId = $(this.editor).find('.property-page-show.current').attr("elementid");
        if (elementId !== undefined && elementId !== null) {
            $(this.editor).find("#"+elementId).trigger("change");
        }
        
        $(this.editor).find('.property-page-hide, .property-type-hidden, .property-page-show').hide();
        $(this.editor).find('.property-page-show').removeClass("current");
        this.pages[pageId].show(scroll);
    },
    refresh: function() {
        $(this.editor).find('.property-page-hide, .property-type-hidden, .property-page-show:not(.current)').hide();
            
        if ($(this.editor).find('.property-page-show.current').length > 0) {
            var current = $(this.editor).find('.property-page-show.current');
            var pageId = $(current).attr('id');
            this.pages[pageId].show();
        }
        this.adjustSize();
    },
    alertValidationErrors: function (errors) {
        var errorMsg = '';
        for(key in errors){
            if(errors[key].fieldName !== '' && errors[key].fieldName !== null){
                errorMsg += errors[key].fieldName + ' : ';
            }
            errorMsg += errors[key].message + '\n';
        }
        alert(errorMsg);
    },
    isChange : function() {
        return !PropertyEditor.Util.deepEquals(this.getData(), this.options.propertyValues);
    },
    save: function() {
        if (this.options.skipValidation || (this.options.propertiesDefinition === undefined || this.options.propertiesDefinition === null)) {
            this.saveCallback(this.getData());
        } else {
            var thisObj = this;
            this.validation(function(data){
                thisObj.saveCallback(data);
            }, function(errors){
                thisObj.saveFailureCallback(errors);
            });
        }
    },
    saveCallback: function (data) {
        if(this.options.closeAfterSaved){
            $(this.editor).remove();
        }

        if($.isFunction(this.options.saveCallback)){
            this.options.saveCallback(this.element, data);
        }

        if(this.options.closeAfterSaved){
            this.clear();
        }
    },
    saveFailureCallback: function (errors) {
        var thisObj = this;
        $(this.editor).find('.property-page-show').each(function(){
            if($(this).find('.property-input-error').length > 0){
                var errorPage = $(this);
                thisObj.changePage(null, $(errorPage).attr("id"));
                var errorField = $(errorPage).find('.property-input-error:first').parent();
                if ($(errorField).find("td.error").length > 0) {
                    $(errorField).find("td.error:first input, td.error:first select").focus();
                } else {
                    $(errorField).find('input, select, textarea').focus();
                }
                return false;
            }
        });

        if($.isFunction(this.options.validationFailedCallback)){
            this.options.validationFailedCallback(this.element, errors);
        }
    },
    cancel: function() {
        $(this.editor).remove();
        if($.isFunction(this.options.cancelCallback)){
            this.options.cancelCallback(this.element);
        }
        this.clear();
    },
    clear: function() {
        this.element = null;
        this.options = null;
        this.editorId = null;
        this.editor = null;
        this.pages = null;
    }
};

PropertyEditor.Model.Page = function(editorObject, number, properties, elementData, parentId) {
    this.editor = editorObject.editor;
    this.editorId = editorObject.editorId;
    this.options = editorObject.options;
    this.editorObject = editorObject;
    this.number = number;
    this.properties = properties;
    this.elementData = typeof elementData !== 'undefined' ? elementData : "";
    this.parentId = typeof parentId !== 'undefined' ? ("_" + parentId) : "";
    this.id = this.editorId + this.parentId + '_' + 'page_' + this.number;
    this.buttonPanel = new PropertyEditor.Model.ButtonPanel(this);
};
PropertyEditor.Model.Page.prototype = {
    isHidden: function() {
        return $(this.editor).find("#"+this.id).hasClass("hidden");
    },
    getData: function(pageProperties) {
        if (this.isHidden()) {
            return pageProperties;
        }
        var useDefault = false;
        if (pageProperties === undefined || pageProperties === null) {
            pageProperties = this.properties.properties;
        } else {
            useDefault = true;
        }
        
        var properties = new Object();
        if(pageProperties !== undefined){
            $.each(pageProperties, function(i, property){
                var type = property.propertyEditorObject;
                
                if (!type.isHidden()) {
                    var data = type.getData(useDefault);
                    
                    //handle Hash Field
                    if (data !== null && data['HASH_FIELD'] !== null && data['HASH_FIELD'] !== undefined) {
                        if (properties['PROPERTIES_EDITOR_METAS_HASH_FIELD'] === undefined) {
                            properties['PROPERTIES_EDITOR_METAS_HASH_FIELD'] = data['HASH_FIELD'];
                        } else {
                            properties['PROPERTIES_EDITOR_METAS_HASH_FIELD'] += ";" + data['HASH_FIELD'];
                        }
                        delete data['HASH_FIELD'];
                    }
                    
                    if (data !== null) {
                        properties = $.extend(properties, data);
                    }
                }
            });
        }
        return properties;
    },
    validate: function(data, errors, depthValidation, pageProperties) {
        var thisObj = this;
        var deferreds = [];
        var checkEncryption = false;
        
        //remove previous error message
        $("#"+this.id+" .property-input-error").remove();
        $("#"+this.id+" .property-editor-page-errors").remove();
        
        if (!this.isHidden()){
            if (pageProperties === undefined || pageProperties === null) {
                pageProperties = this.properties.properties;

                if (this.properties.validators !== null && this.properties.validators !== undefined) {
                    $.each(this.properties.validators, function(i, property){
                        var validator = property.propertyEditorObject;
                        if (validator === undefined) {
                            validator = PropertyEditor.Util.getValidatorObject(thisObj, property);
                            property.propertyEditorObject = validator;
                        }
                        var deffers = validator.validate(data, errors);
                        if (deffers !== null && deffers !== undefined && deffers.length > 0) {
                            deferreds = $.merge(deferreds, deffers);
                        }
                    });
                }
            } else {
                checkEncryption = true;
            }

            if (depthValidation && pageProperties !== undefined && pageProperties !== null){
                $.each(pageProperties, function(i, property){
                    var type = property.propertyEditorObject;
                    if (!type.isHidden()) {
                        var deffers = type.validate(data, errors, checkEncryption);
                        if (deffers !== null && deffers !== undefined && deffers.length > 0) {
                            deferreds = $.merge(deferreds, deffers);
                        }
                    }
                });
            }
        }
        
        return deferreds;
    },
    validation: function(successCallback, failureCallback, depthValidation, pageProperties) {
        var errors = [];
        var data = this.getData(pageProperties);
        var deferreds = [];
        
        deferreds = $.merge(deferreds, this.validate(data, errors, depthValidation, pageProperties));
        
        if (deferreds.length === 0) {
            var dummy = $.Deferred();
            deferreds.push(dummy);
            dummy.resolve();
        }
        
        $.when.apply($, deferreds).then(function(){
            if (errors.length > 0) {
                failureCallback(errors);
            } else if (successCallback !== undefined && successCallback !== null) {
                successCallback(data);
            }
        });
    },
    render: function() {
        var hiddenClass = " property-page-show";
        var pageTitle = '';

        if(this.properties.hidden !== undefined && this.properties.hidden.toLowerCase() === "true"){
            hiddenClass = " property-page-hide";
        }
        
        var showHide = "";
        if (this.properties.control_field !== undefined && this.properties.control_field !== null 
                && this.properties.control_value !== undefined && this.properties.control_value !== null) {
            showHide = 'data-control_field="' + this.properties.control_field + '" data-control_value="'+this.properties.control_value+'"';
            
            if (this.properties.control_use_regex !== undefined && this.properties.control_use_regex.toLowerCase() === "true") {
                showHide += ' data-control_use_regex="true"';
            } else {
                showHide += ' data-control_use_regex="false"';
            }
        }
        
        if(this.properties.title !== undefined && this.properties.title !== null){
            pageTitle = this.properties.title;
        }
        
        if (this.properties.properties === undefined) {
            hiddenClass += " no-property-page";
            pageTitle = get_peditor_msg('peditor.noProperties');
        }
        
        var helplink = "";
        if (this.properties.helplink !== undefined && this.properties.helplink !== "") {
            helplink = ' <a class="helplink" target="_blank" href="'+this.properties.helplink+'"><i class="fa fa-question-circle"></i></a>'
        }
        
        var html = '<div id="' + this.id + '" '+ this.elementData + 'class="property-editor-page' + hiddenClass + '" ' + showHide + '>';
        html += '<div class="property-editor-page-title"><span>'+pageTitle+'</span>'+helplink+'</div><div class="property-editor-page-step-indicator"></div><div class="property-editor-property-container">';
        
        html += this.renderProperties();
        
        html += '<div class="property-editor-page-buffer"></div></div>' + this.buttonPanel.render() + '</div>';
        
        return html;
    },
    renderProperties: function() {
        var html = "";
        if(this.properties.properties !== undefined){
            var page = this;
            $.each(this.properties.properties, function(i, property){
                html += page.renderProperty(i, "", property);
            });
        }
        return html;
    },
    renderProperty: function(i, prefix, property) {
        var type = property.propertyEditorObject;
        
        if (type === undefined) {
            var value = null;
            if(this.options.propertyValues !== null && this.options.propertyValues !== undefined && this.options.propertyValues[property.name] !== undefined){
                value = this.options.propertyValues[property.name];
            }else if(property.value !== undefined && property.value !== null){
                value = property.value;
            }

            var defaultValue = null;

            if(this.options.defaultPropertyValues !== null && this.options.defaultPropertyValues !== undefined && this.options.defaultPropertyValues[property.name] !== undefined 
                    && this.options.defaultPropertyValues[property.name] !== ""){
                defaultValue = this.options.defaultPropertyValues[property.name];
            }
        
            type = PropertyEditor.Util.getTypeObject(this, i, prefix, property, value, defaultValue);
            property.propertyEditorObject = type;
            
            if (prefix === "" || prefix === null || prefix === undefined) {
                this.editorObject.fields[property.name] = type;
            }
        }
        
        if (type !== null) {
            return type.render();
        }
        return "";
    },
    initScripting: function() {
        if(this.properties.properties !== undefined){
            $.each(this.properties.properties, function(i, property){
                var type = property.propertyEditorObject;
                type.initScripting();
                type.initDefaultScripting();
            });
        }
        PropertyEditor.Util.handleDynamicOptionsField(this);
        
        this.buttonPanel.initScripting();
        this.attachDescriptionEvent();
        this.attachHashVariableAssistant();
    },
    show: function(scroll) {
        var page = $(this.editor).find("#"+this.id);
        $(page).show();
        if (this.editorObject.isSinglePageDisplay()) {
            if (scroll === undefined || scroll) {
                var pages = $(this.editor).find('.property-editor-pages');
                var pos = $(page).offset().top - $(pages).offset().top - 50 - ($(pages).find(' > div:eq(0)').offset().top - $(pages).offset().top - 50);
                $(this.editor).find('.property-editor-pages').scrollTo(pos, 200);
            }
        }
        
        $(page).addClass("current");
        this.refreshStepsIndicator();
        this.buttonPanel.refresh();
        
        if(this.properties.properties !== undefined){
            $.each(this.properties.properties, function(i, property){
                var type = property.propertyEditorObject;
                type.pageShown();
            });
        }
        var fields = $(page).find('.property-editor-property-container .property-editor-property .property-input').find('input:not(:hidden), select, textarea');
        if (fields.length > 0) {
            fields[0].focus();
        }
    },
    remove: function() {
        var page = $(this.editor).find("#"+this.id);
        
        if(this.properties.properties !== undefined){
            $.each(this.properties.properties, function(i, property){
                var type = property.propertyEditorObject;
                type.remove();
            });
        }
        
        $(page).remove();
    },
    refreshStepsIndicator: function() {
        if ((this.editorObject.isSinglePageDisplay() && $(this.editor).find('.property-page-show').length > 0) 
                || (!this.editorObject.isSinglePageDisplay() && $(this.editor).find('.property-page-show').length > 1)) {
            var thisObject = this;
            var editor = this.editor;
            var currentPage = $(editor).find(".property-page-show.current");
            var currentPageParentElementId = $(currentPage).attr("elementid");
            if ($(currentPage).attr("parentElementid") !== undefined && $(currentPage).attr("parentElementid") !== "") {
                currentPageParentElementId = $(currentPage).attr("parentElementid");
            }
            var prev = null;
            var html = '';
            
            $(this.editor).find('.property-page-show').each(function(i){
                var pageId = $(this).attr("id");
                var parentElementId = $(this).attr("elementid");
                if ($(this).attr("parentElementid") !== undefined && $(this).attr("parentElementid") !== "") {
                    parentElementId = $(this).attr("parentElementid");
                }
                
                if (prev !== null && prev !== parentElementId && currentPageParentElementId !== prev) {
                    html += ' <span class="seperator">'+get_peditor_msg('peditor.stepSeperator')+'</span> ';
                }
                
                if (parentElementId === undefined || currentPageParentElementId === parentElementId) {
                    prev = null;
                    var childPageClass = "";

                    if(parentElementId !== undefined && currentPageParentElementId === parentElementId) {
                        childPageClass = " childPage";
                    }

                    if($(this).hasClass("current")){
                        html += '<span class="step active'+childPageClass+'">';
                    }else{
                        html += '<span class="step clickable'+childPageClass+'" rel="'+pageId+'" style="cursor:pointer">';
                    }
                    html += $(this).find('.property-editor-page-title span').html() + '</span>';

                    if(i < $(editor).find('.property-page-show').length - 1){
                        html += ' <span class="seperator">'+get_peditor_msg('peditor.stepSeperator')+'</span> ';
                    }
                } else {
                    var value = $("#"+parentElementId).val();
                    var valueLabel = $("#"+parentElementId).find('option[value="'+value+'"]').text();
                    var label = $("#"+parentElementId).parent().prev(".property-label-container").find(".property-label")
                    .clone().children().remove().end().text();

                    if (prev !== parentElementId) {
                        if($(this).hasClass("current")){
                            html += '<span class="step active">';
                        }else{
                            html += '<span class="step clickable" rel="'+pageId+'" style="cursor:pointer">';
                        }
                        html += label + " (" + valueLabel + ')</span>';
                    }
                    prev = parentElementId;
                }
            });
            html += '<div style="clear:both;"></div>';

            $(this.editor).find('#'+this.id+' .property-editor-page-step-indicator').html(html);
            $(this.editor).find('#'+this.id+' .property-editor-page-step-indicator .clickable').click(function(){
                thisObject.editorObject.changePage($(currentPage).attr("id"), $(this).attr("rel"));
            });
            
            if (this.editorObject.isSinglePageDisplay()) {
                $(this.editor).find('.property-editor-nav').html('');
                $(this.editor).find('.property-editor-nav').append($(this.editor).find('#'+this.id+' .property-editor-page-step-indicator').clone(true));
            }
        }
    },
    attachDescriptionEvent: function(){
        $(this.editor).find("#"+this.id).find("input, select, textarea").focus(function(){
            $(this.editor).find(".property-description").hide();
            var property = $(this).parentsUntil(".property-editor-property-container", ".property-editor-property");
            $(property).find(".property-description").show();
        });
    },
    attachHashVariableAssistant: function() {
        $(this.editor).find("#"+this.id).hashVariableAssitant(this.options.contextPath);
    }
};

PropertyEditor.Model.ButtonPanel = function(page) {
    this.page = page;
    this.pageId = page.id;
    this.options = page.options;
    this.editor = page.editor;
};
PropertyEditor.Model.ButtonPanel.prototype = {
    render: function() {
        var page = this.page;
        var html = '<div class="property-editor-page-button-panel">';
        html += '<div class="page-button-navigation">';
        html += '<input type="button" class="page-button-prev" value="'+ this.options.previousPageButtonLabel +'"/>';
        html += '<input type="button" class="page-button-next" value="'+ this.options.nextPageButtonLabel +'"/>';
        html += '</div><div class="page-button-action">';
        if (page.properties.buttons !== undefined && page.properties.buttons !== null) {
            $.each(page.properties.buttons, function(i, button){
                var showHide = "";
        
                if (button.control_field !== undefined && button.control_field !== null && button.control_value !== undefined && button.control_value !== null) {
                    showHide = 'data-control_field="' + button.control_field + '" data-control_value="'+button.control_value+'"';

                    if (button.control_use_regex !== undefined && button.control_use_regex.toLowerCase() === "true") {
                        showHide += ' data-control_use_regex="true"';
                    } else {
                        showHide += ' data-control_use_regex="false"';
                    }
                }
                
                if (button.ajax_method === undefined) {
                    button.ajax_method = "GET";
                }
        
                html += '<input id="'+page.id + '_' + button.name+'" type="button" class="page-button-custom" value="'+ button.label +'" data-ajax_url="'+button.ajax_url+'" data-ajax_method="'+button.ajax_method+'" data-action="'+button.name+'" '+showHide+' />';
                if (button.addition_fields !== undefined && button.addition_fields !== null) {
                    html += '<div id="'+ page.id +'_'+ button.name +'_form" class="button_form" style="display:none;">';
                    html += '<div id="main-body-header" style="margin-bottom:15px;">'+button.label+'</div>';
                    $.each(button.addition_fields, function(i, property){
                        html += page.renderProperty(i, button.name, property);
                    });
                    html += '</div>';
                }
            });
        }
        
        html += '<input type="button" class="page-button-save" value="'+ this.options.saveButtonLabel +'"/>';
        if(this.options.showCancelButton){
            html += '<input type="button" class="page-button-cancel" value="'+ this.options.cancelButtonLabel +'"/>';
        }
        html += '</div><div style="clear:both"></div></div>';
        return html;
    },
    initScripting: function() {
        var currentPage = $(this.editor).find("#"+this.pageId);
        var page = this.page;
        var panel = this;
        $(currentPage).find('input.page-button-next').click(function(){
            page.editorObject.nextPage();
        });

        //previous page event
        $(currentPage).find('input.page-button-prev').click(function(){
            page.editorObject.prevPage();
        });

        //save event
        $(currentPage).find('input.page-button-save').click(function(){
            page.editorObject.save();
        });

        //cancel event
        $(currentPage).find('input.page-button-cancel').click(function(){
            page.editorObject.cancel();
        });
        
        //custom page button
        $(currentPage).find('.page-button-custom').click(function(){
            var button = $(this);
            var id = $(button).attr("id");
            
            //get properties
            var buttonProperties;
            $.each(page.properties.buttons, function(i, buttonProp){
                if (buttonProp.name === $(button).data("action")) {
                    buttonProperties = buttonProp;
                }
            });
            
            var pageProperties = page.properties.properties;
            pageProperties = $.grep(pageProperties, function(property){
                if (buttonProperties.fields !== undefined && buttonProperties.fields.indexOf(property.name) !== -1) {
                    if (buttonProperties.require_fields !== undefined && buttonProperties.require_fields.indexOf(property.name) !== -1) {
                        property.required = "true";
                    }
                    return true;
                }
                return false;
            });
            
            page.validation(function(data){
                //popup form for extra input
                if ($("#"+id+"_form").length === 1) {
                    var object = $("#"+id+"_form");
                    $(object).dialog({ 
                        modal: true,
                        width : "70%",
                        buttons: [{
                            text: $(button).attr("value"),
                            click: function () {
                                page.validation(function(addition_data){
                                    data = $.extend(data, addition_data);
                                    panel.executeButtonEvent(data, $(button).data("ajax_url"), $(button).data("ajax_method"));
                                    $(object).dialog("close");
                                }, function(errors){}, true, buttonProperties.addition_fields);
                            }
                        }],
                        close: function( event, ui ) {
                            $(object).dialog("destroy");
                        }
                    });
                } else {        
                    panel.executeButtonEvent(data, $(button).data("ajax_url"), $(button).data("ajax_method"));
                }
            }, function(errors){}, true, pageProperties);
            return false;
        });
    },
    executeButtonEvent: function(data, url, method) {
        
        $.each(data, function(i, d){
            if (d.indexOf("%%%%") !== -1 && d.substring(0, 4) === "%%%%", d.substring(d.length - 4) === "%%%%") {
                data[i] = d.replace(/%%%%/g, ""); 
            }
        });
                    
        $.ajax({
            method: method,
            url: PropertyEditor.Util.replaceContextPath(url, this.options.contextPath),
            data : $.param( data ),
            dataType : "text",
            success: function(response) {
                var r = $.parseJSON(response);
                
                if (r.message !== undefined && r.message !== null) {
                    alert(r.message);
                }
            }
        });
    },
    refresh: function() {
        if ($(this.editor).find('.property-page-show').length === 1) {
            $(this.editor).find('.property-page-show .property-editor-page-button-panel .page-button-navigation').hide();
        } else {
            $(this.editor).find('.property-page-show .property-editor-page-button-panel .page-button-navigation').show();
            $(this.editor).find('.property-page-show .property-editor-page-button-panel .page-button-navigation input[type=button]').removeAttr("disabled");
            $(this.editor).find('.property-page-show:first .property-editor-page-button-panel .page-button-navigation .page-button-prev').attr("disabled","disabled");
            $(this.editor).find('.property-page-show:last .property-editor-page-button-panel .page-button-navigation .page-button-next').attr("disabled","disabled");
        }
        
        if (this.page.editorObject.isSinglePageDisplay()) {
            $(this.editor).find('.property-editor-buttons').html('');
            $(this.editor).find('.property-editor-buttons').append($(this.editor).find('.property-page-show.current .property-editor-page-button-panel').clone(true));
        }
    }
};

PropertyEditor.Model.Validator = function(page, properties) {
    this.page = page;
    this.editorObject = this.page.editorObject;
    this.editor = this.page.editor;
    this.properties = properties;
    this.options = this.page.options;
};
PropertyEditor.Model.Validator.prototype = {
    initialize: function() {
    },
    validate: function(data, errors) {
    }
};

PropertyEditor.Validator.Ajax = function(){};
PropertyEditor.Validator.Ajax.prototype = {
    shortname : "ajax",
    validate: function(data, errors) {
        var thisObject = this;
        var deffers = [];
        var d = $.Deferred();
        deffers.push(d);
        
        $.ajax({
            url: PropertyEditor.Util.replaceContextPath(this.properties.url, thisObject.options.contextPath),
            data : $.param( data ),
            dataType : "text",
            success: function(response) {
                var r = $.parseJSON(response);
                var errorsHtml = "";
                if(r.status.toLowerCase() === "fail"){
                    if(r.message.length === 0){
                        var obj = new Object();
                        obj.fieldName = '';
                        obj.message = thisObject.properties.default_error_message;

                        errors.push(obj);
                        errorsHtml += '<div class="property-input-error">'+obj.message+'</div>';
                    }else{
                        for(i in r.message){
                            var obj2 = new Object();
                            obj2.fieldName = '';
                            obj2.message = r.message[i];

                            errors.push(obj2);
                            errorsHtml += '<div class="property-input-error">'+obj2.message+'</div>';
                        }
                    }
                }
                
                if(errorsHtml !== ""){
                    var page = $(thisObject.editor).find('#'+thisObject.page.id);
                    var errorContainer;
                    if( $(page).find(".property-editor-page-errors").length === 0) {
                        $(page).find('.property-editor-property-container').prepend('<div class="property-editor-page-errors"></div>');
                    }
                    var  errorContainer = $(page).find(".property-editor-page-errors");
                    $(errorContainer).append(errorsHtml);
                }
                d.resolve();
            },
            error: function() {
                var obj = new Object();
                obj.fieldName = '';
                obj.message = get_peditor_msg('peditor.validationFailed');
                errors.push(obj);
                d.resolve();
            }
        });
        
        return deffers;
    }
};
PropertyEditor.Validator.Ajax = PropertyEditor.Util.inherit( PropertyEditor.Model.Validator, PropertyEditor.Validator.Ajax.prototype);

PropertyEditor.Model.Type = function(page, number, prefix, properties, value, defaultValue) {
    this.page = page;
    this.number = number;
    this.prefix = prefix;
    if (this.prefix !== undefined && this.prefix !== null && this.prefix !== "") {
        this.prefix = "_" + this.prefix;
    } else {
        this.prefix = "";
    }
    this.editorObject = this.page.editorObject;
    this.editor = this.page.editor;
    this.editorId = this.page.editorId;
    this.parentId = this.page.parentId;
    this.id = this.editorId + this.parentId + this.prefix + '_' + properties.name;
    this.properties = properties;
    this.value = value;
    this.defaultValue = defaultValue;
    this.options = this.page.options;
    this.isDataReady = true;
};
PropertyEditor.Model.Type.prototype = {
    initialize: function() {
    },
    validate: function(data, errors, checkEncryption) {
        var wrapper = $('#'+ this.id +'_input');
        
        var value = data[this.properties.name];
        var defaultValue = null;

        if(this.defaultValue !== undefined && this.defaultValue !== null && this.defaultValue !== ""){
            defaultValue = this.defaultValue;
        }
        
        var hasValue = true;
        if (value === '' || value === undefined || value === null || value === '%%%%%%%%'
            || ($.isArray(value) && value.length === 0)) {
            hasValue = false;
        }
        
        if(this.properties.required !== undefined 
                && this.properties.required.toLowerCase() === "true" 
                && defaultValue === null && !hasValue){
            var obj = new Object();
            obj.field = this.properties.name;
            obj.fieldName = this.properties.label;
            obj.message = this.options.mandatoryMessage;
            errors.push(obj);
            $(wrapper).append('<div class="property-input-error">'+ obj.message +'</div>');
        }
        
        if(hasValue 
                && this.properties.regex_validation !== undefined 
                && this.properties.regex_validation !== '' 
                && (typeof value) === "string"){
            var regex = new RegExp(this.properties.regex_validation);
            if(!regex.exec(value)){
                var obj2 = new Object();
                obj2.fieldName = this.properties.label;
                if(this.properties.validation_message !== undefined && this.properties.validation_message !== '' ){
                    obj2.message = this.properties.validation_message;
                }else{
                    obj2.message = get_peditor_msg('peditor.validationFailed');
                }
                errors.push(obj2);
                $(wrapper).append('<div class="property-input-error">'+ obj2.message +'</div>');
            }
        }
        
        if(this.properties.js_validation !== undefined && this.properties.js_validation !== ''){
            var func = PropertyEditor.Util.getFunction(this.properties.js_validation);
            if ($.isFunction(func)) {
                var errorMsg = func(this.properties.name, value);
                
                if (errorMsg !== null && errorMsg !== "") {
                    var obj2 = new Object();
                    obj2.fieldName = this.properties.label;
                    obj2.message = errorMsg;
                    errors.push(obj2);
                    $(wrapper).append('<div class="property-input-error">'+ obj2.message +'</div>');
                }
            }
        }
        
        if ((checkEncryption !== undefined && checkEncryption) && hasValue && (typeof value) === "string") {
            if ((value.substring(0, 25) === "%%%%****SECURE_VALUE****-")) { 
                var obj2 = new Object();
                obj2.fieldName = this.properties.label;
                obj2.message = get_peditor_msg('peditor.dataIsEncypted');
                errors.push(obj2);
                $(wrapper).append('<div class="property-input-error">'+ obj2.message +'</div>');
            }
        }
        
        this.addOnValidation(data, errors, checkEncryption);
    },
    addOnValidation : function (data, errors, checkEncryption) {
        //nothing will happen
    },
    getData: function(useDefault) {
        var data = new Object();
        var value = this.value;
        
        if (this.isDataReady) {        
            value = $('[name='+this.id+']:not(.hidden)').val();
            if (value === undefined || value === null || value === "") {
                if (useDefault !== undefined && useDefault 
                        && this.defaultValue !== undefined && this.defaultValue !== null) {
                    value = this.defaultValue;
                } else {
                    value = "";
                }
            }
            value = value.trim();
        }
        data[this.properties.name] = value;
        PropertyEditor.Util.retrieveHashFieldValue(this, data);
        return data;
    },
    render: function() {
        var showHide = "";
        
        if (this.properties.control_field !== undefined && this.properties.control_field !== null 
                && this.properties.control_value !== undefined && this.properties.control_value !== null) {
            showHide = 'data-control_field="' + this.properties.control_field + '" data-control_value="'+this.properties.control_value+'"';
            
            if (this.properties.control_use_regex !== undefined && this.properties.control_use_regex.toLowerCase() === "true") {
                showHide += ' data-control_use_regex="true"';
            } else {
                showHide += ' data-control_use_regex="false"';
            }
        }
        
        var html = '<div id="property_'+ this.number +'" class="property_container_'+this.id+' property-editor-property property-type-'+ this.properties.type.toLowerCase() +'" '+showHide+'>';
        
        html += this.renderLabel();
        html += this.renderFieldWrapper();
        
        html += '<div style="clear:both;"></div></div>';
        
        return html;
    },
    renderLabel: function() {
        var html = "";
        if(this.properties.label !== undefined && this.properties.label !== null){
            var required = '';
            if(this.properties.required !== undefined && this.properties.required.toLowerCase() === 'true'){
                required = ' <span class="property-required">'+get_peditor_msg('peditor.mandatory.symbol')+'</span>';
            }

            var description = '';
            if(this.properties.description !== undefined && this.properties.description !== null){
               description = this.properties.description;
            }

            var toolTip = '';
            if(this.options.showDescriptionAsToolTip){
                toolTip = ' title="'+ description +'"';
            }

            html += '<div class="property-label-container">';
            html += '<div class="property-label"'+ toolTip +'>'+ this.properties.label + required + '</div>';

            if(!this.options.showDescriptionAsToolTip){
                html += '<div class="property-description">'+ description +'</div>';
            }
            html += '</div>';
        }
        return html;
    },
    renderFieldWrapper: function() {
        var html = '<div id="'+ this.id +'_input" class="property-input">';
        html += this.renderField();
        html += this.renderDefault();
        html += '</div>';
        return html;
    },
    renderField: function() {
        return "";
    },
    renderDefault: function() {
        var html = '';
        if(this.defaultValue !== null){
            html = '<div class="default"><span class="label">'+get_peditor_msg('peditor.default')+'</span><span class="value">'+PropertyEditor.Util.escapeHtmlTag(this.defaultValue)+'</span><div class="clear"></div></div>';
        }
        return html;
    },
    initDefaultScripting: function () {
        PropertyEditor.Util.handleOptionsField(this);
    },
    initScripting: function () {},
    handleAjaxOptions: function(options, reference) {
        if (options !== null && options !== undefined) {
            this.properties.options = options;
            
            var value = $('#'+ this.id).val();
            if (value === "" || value === null) {
                value = this.value;
            }
            
            var wrapper = $('#'+ this.id +'_input');
            var html = this.renderField() + this.renderDefault();
            $(wrapper).html(html);
            $('#'+ this.id).val(value);
            $('#'+ this.id).trigger("change");
        }
    },
    isHidden: function() {
        return $(".property_container_"+this.id+":not(.hidden)").length === 0;
    },
    pageShown: function() {},
    remove: function() {}
};

PropertyEditor.Type.Header = function(){};
PropertyEditor.Type.Header.prototype = {
    shortname : "header",
    getData: function(useDefault) {
        return null;
    },
    validate: function(data, errors, checkEncryption) {}
};
PropertyEditor.Type.Header = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.Header.prototype);

PropertyEditor.Type.Hidden = function(){};
PropertyEditor.Type.Hidden.prototype = {
    shortname : "hidden",
    renderField: function() {
        if(this.value === null){
            this.value = "";
        }
        return '<input type="hidden" id="'+ this.id +'" name="'+ this.id +'" value="'+ PropertyEditor.Util.escapeHtmlTag(this.value) +'" />';
    },
    renderDefault: function() {
        return "";
    },
    validate: function(data, errors, checkEncryption) {}
};
PropertyEditor.Type.Hidden = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.Hidden.prototype);

PropertyEditor.Type.Label = function(){};
PropertyEditor.Type.Label.prototype = {
    shortname : "label",
    renderField: function() {
        if(this.value === null){
            this.value = "";
        }
        return '<input type="hidden" id="'+ this.id +'" name="'+ this.id +'" value="'+ PropertyEditor.Util.escapeHtmlTag(this.value) +'" /><label>'+PropertyEditor.Util.escapeHtmlTag(this.value)+'</label>';
    },
    renderDefault: function() {
        return "";
    }
};
PropertyEditor.Type.Label = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.Label.prototype);

PropertyEditor.Type.Readonly = function(){};
PropertyEditor.Type.Readonly.prototype = {
    shortname : "readonly",
    renderField: function() {
        if(this.value === null){
            this.value = "";
        }
        var size = '';
        if(this.properties.size !== undefined && this.properties.size !== null){
            size = ' size="'+ this.properties +'"';
        } else {
            size = ' size="50"';
        }
        return '<input type="text" id="'+ this.id +'" name="'+ this.id +'"'+ size +' value="'+ PropertyEditor.Util.escapeHtmlTag(this.value) +'" disabled />';
    },
    renderDefault: function() {
        return "";
    }
};
PropertyEditor.Type.Readonly = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.Readonly.prototype);

PropertyEditor.Type.TextField = function(){};
PropertyEditor.Type.TextField.prototype = {
    shortname : "textfield",
    renderField: function() {
        var size = '';
        if(this.value === null){
            this.value = "";
        }
        if(this.properties.size !== undefined && this.properties.size !== null){
            size = ' size="'+ this.properties.size +'"';
        } else {
            size = ' size="50"';
        }
        var maxlength = '';
        if(this.properties.maxlength !== undefined && this.properties.maxlength !== null){
            maxlength = ' maxlength="'+ this.properties.maxlength +'"';
        }

        return '<input type="text" id="'+ this.id + '" name="'+ this.id + '"'+ size + maxlength +' value="'+ PropertyEditor.Util.escapeHtmlTag(this.value) +'"/>';
    }
};
PropertyEditor.Type.TextField = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.TextField.prototype);

PropertyEditor.Type.Color = function(){};
PropertyEditor.Type.Color.prototype = {
    shortname : "color",
    renderField: function() {
        if(this.value === null){
            this.value = "";
        }
        return '<input class="jscolor" type="text" id="'+ this.id + '" name="'+ this.id + '"'+ ' value="'+ PropertyEditor.Util.escapeHtmlTag(this.value) +'"/>';
    },
    initScripting: function () {
        $("#"+this.id).data('colorMode', 'HEX').colorPicker({
            opacity: false, // disables opacity slider
            renderCallback: function($elm, toggled) {
                if ($elm.val() !== "" && $elm.val() !== undefined) {
                    $elm.val('#' + this.color.colors.HEX);
                }
            }
        }); 
        PropertyEditor.Util.supportHashField(this);
    }
};
PropertyEditor.Type.Color = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.Color.prototype);

PropertyEditor.Type.Password = function(){};
PropertyEditor.Type.Password.prototype = {
    shortname : "password",
    getData: function(useDefault) {
        var data = new Object();
        var value = $('[name='+this.id+']:not(.hidden)').val();
        if (value === undefined || value === null || value === "") {
            if (useDefault !== undefined && useDefault 
                    && this.defaultValue !== undefined && this.defaultValue !== null) {
                value = this.defaultValue;
            } else {
                value = "";
            }
        }
        value = "%%%%" + value + "%%%%";
        data[this.properties.name] = value;
        return data;
    },
    renderField: function() {
        var size = '';
        if(this.value === null){
            this.value = "";
        }
        if(this.properties.size !== undefined && this.properties.size !== null){
            size = ' size="'+ this.properties.size +'"';
        } else {
            size = ' size="50"';
        }
        var maxlength = '';
        if(this.properties.maxlength !== undefined && this.properties.maxlength !== null){
            maxlength = ' maxlength="'+ this.properties.maxlength +'"';
        }

        this.value = this.value.replace(/%%%%/g, '');
        
        return '<input type="password" autocomplete="new-password" id="'+ this.id + '" name="'+ this.id + '"'+ size + maxlength +' value="'+ PropertyEditor.Util.escapeHtmlTag(this.value) +'"/>';
    },
    renderDefault: function() {
        var html = '';
        if(this.defaultValue !== null){
            defaultValue = this.defaultValue.replace(/./g, '*');
            html = '<div class="default"><span class="label">'+get_peditor_msg('peditor.default')+'</span><span class="value">'+PropertyEditor.Util.escapeHtmlTag(defaultValue)+'</span><div class="clear"></div></div>';
        }
        return html;
    }
};
PropertyEditor.Type.Password = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.Password.prototype);

PropertyEditor.Type.TextArea = function(){};
PropertyEditor.Type.TextArea.prototype = {
    shortname : "textarea",
    renderField: function() {
        var rows = '';
        if(this.value === null){
            this.value = "";
        }
        if(this.properties.rows !== undefined && this.properties.rows !== null){
            rows = ' rows="'+ this.properties.rows +'"';
        } else {
            rows = ' rows="5"';
        }
        var cols = '';
        if(this.properties.cols !== undefined && this.properties.cols !== null){
            cols = ' cols="'+ this.properties.cols +'"';
        } else {
            cols = ' cols="50"';
        }

        return '<textarea id="'+ this.id + '" name="'+ this.id + '"'+ rows + cols +'>'+ PropertyEditor.Util.escapeHtmlTag(this.value) +'</textarea>';
    },
    renderDefault: function() {
        var html = '';
        if(this.defaultValue !== null){
            html = '<div class="default"><span class="label">'+get_peditor_msg('peditor.default')+'</span><span class="value">'+PropertyEditor.Util.nl2br(PropertyEditor.Util.escapeHtmlTag(this.defaultValue))+'</span><div class="clear"></div></div>';
        }
        return html;
    }
};
PropertyEditor.Type.TextArea = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.TextArea.prototype);

PropertyEditor.Type.CheckBox = function(){};
PropertyEditor.Type.CheckBox.prototype = {
    shortname : "checkbox",
    getData: function(useDefault) {
        var data = new Object();
        var value = this.value;
        
        if (this.isDataReady) {
            value = "";
            $('[name='+ this.id + ']:not(.hidden):checkbox:checked').each(function(i){
                value += $(this).val() + ';';
            });
            if(value !== ''){
                value = value.replace(/;$/i, '');
            } else if (useDefault !== undefined && useDefault 
                    && this.defaultValue !== undefined && this.defaultValue !== null) {
                value = this.defaultValue;
            }
        }
        data[this.properties.name] = value;
        PropertyEditor.Util.retrieveHashFieldValue(this, data);
        return data;
    },
    renderField: function() {
        var thisObj = this;
        var html = '';

        if(this.value === null){
            this.value = "";
        }
        
        PropertyEditor.Util.retrieveOptionsFromCallback(this.properties);

        if(this.properties.options !== undefined && this.properties.options !== null){
            $.each(this.properties.options, function(i, option){
                var checked = "";
                $.each(thisObj.value.split(";"), function(i, v){
                    if(v === option.value){
                        checked = " checked";
                    }
                });
                html += '<span class="multiple_option"><label><input type="checkbox" id="'+ thisObj.id +'" name="'+ thisObj.id +'" value="'+PropertyEditor.Util.escapeHtmlTag(option.value)+'"'+checked+'/>'+PropertyEditor.Util.escapeHtmlTag(option.label)+'</label></span>';
            });
        }
        return html;
    },
    renderDefault: function() {
        var defaultValueText = '';
        
        if(this.defaultValue === null || this.defaultValue === undefined){
            this.defaultValue = "";
        }
        
        var checkbox = this;
        if(this.properties.options !== undefined && this.properties.options !== null){
            $.each(this.properties.options, function(i, option){
                $.each(checkbox.defaultValue.split(";"), function(i, v){
                    if(v !== "" && v === option.value){
                        defaultValueText += PropertyEditor.Util.escapeHtmlTag(option.label) + ', ';
                    }
                });
            });
        }

        if(defaultValueText !== ''){
            defaultValueText = defaultValueText.substring(0, defaultValueText.length - 2);
            defaultValueText = '<div class="default"><span class="label">'+get_peditor_msg('peditor.default')+'</span><span class="value">' + PropertyEditor.Util.escapeHtmlTag(defaultValueText) + '</span><div class="clear"></div></div>';
        }
        
        return defaultValueText;
    },
    initScripting: function () {
        PropertyEditor.Util.supportHashField(this);
    }
};
PropertyEditor.Type.CheckBox = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.CheckBox.prototype);

PropertyEditor.Type.Radio = function(){};
PropertyEditor.Type.Radio.prototype = {
    shortname : "radio",
    getData: function(useDefault) {
        var data = new Object();
        var value = this.value;
        
        if (this.isDataReady) {
            value = $('[name='+this.id+']:not(.hidden):checked').val();
            if (value === undefined || value === null || value === "") {
                if (useDefault !== undefined && useDefault 
                        && this.defaultValue !== undefined && this.defaultValue !== null) {
                    value = this.defaultValue;
                } else {
                    value = "";
                }
            }
        }
        data[this.properties.name] = value;
        PropertyEditor.Util.retrieveHashFieldValue(this, data);
        return data;
    },
    renderField: function() {
        var thisObj = this;
        var html = '';

        if(this.value === null){
            this.value = "";
        }
        
        PropertyEditor.Util.retrieveOptionsFromCallback(this.properties);

        if(this.properties.options !== undefined && this.properties.options !== null){
            $.each(this.properties.options, function(i, option){
                var checked = "";
                if(thisObj.value === option.value){
                    checked = " checked";
                }
                html += '<span class="multiple_option"><label><input type="radio" id="'+ thisObj.id +'" name="'+ thisObj.id +'" value="'+PropertyEditor.Util.escapeHtmlTag(option.value)+'"'+checked+'/>'+PropertyEditor.Util.escapeHtmlTag(option.label)+'</label></span>';
            });
        }
        return html;
    },
    initScripting: function () {
        PropertyEditor.Util.supportHashField(this);
    },
    renderDefault: PropertyEditor.Type.CheckBox.prototype.renderDefault
};
PropertyEditor.Type.Radio = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.Radio.prototype);

PropertyEditor.Type.SelectBox = function(){};
PropertyEditor.Type.SelectBox.prototype = {
    shortname : "selectbox",
    renderField: function() {
        var thisObj = this;
        var html = '<select id="'+ this.id +'" name="'+ this.id +'" class="initChosen">';

        if(this.value === null){
            this.value = "";
        }
        
        PropertyEditor.Util.retrieveOptionsFromCallback(this.properties);

        if(this.properties.options !== undefined && this.properties.options !== null){
            $.each(this.properties.options, function(i, option){
                var selected = "";
                if(thisObj.value === option.value){
                    selected = " selected";
                }
                html += '<option value="'+PropertyEditor.Util.escapeHtmlTag(option.value)+'"'+selected+'>'+PropertyEditor.Util.escapeHtmlTag(option.label)+'</option>';
            });
        }
        html += '</select>';
        return html;
    },
    renderDefault: PropertyEditor.Type.CheckBox.prototype.renderDefault,
    handleAjaxOptions: function(options, reference) {
        var thisObj = this;
        if (options !== null && options !== undefined) {
            this.properties.options = options;
            var html = "";
            
            var value = $("#"+this.id).val();
            if (value === "" || value === null) {
                value = thisObj.value;
            }
            
            $.each(this.properties.options, function(i, option){
                var selected = "";
                if(value === option.value){
                    selected = " selected";
                }
                html += '<option value="'+PropertyEditor.Util.escapeHtmlTag(option.value)+'"'+selected+'>'+PropertyEditor.Util.escapeHtmlTag(option.label)+'</option>';
            });
            $("#"+this.id).html(html);
            $("#"+this.id).trigger("change");
            $("#"+this.id).trigger("chosen:updated");
        }
    },
    initScripting: function () {
        $("#"+this.id).chosen({width: "54%", placeholder_text : " "});
        PropertyEditor.Util.supportHashField(this);
    },
    pageShown: function () {
        $("#"+this.id).trigger("chosen:updated");
    }
};
PropertyEditor.Type.SelectBox = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.SelectBox.prototype);

PropertyEditor.Type.MultiSelect = function(){};
PropertyEditor.Type.MultiSelect.prototype = {
    shortname : "multiselect",
    getData: function(useDefault) {
        var data = new Object();
        var value = this.value;
        
        if (this.isDataReady) {
            value = "";
            var values = $('[name='+this.id+']:not(.hidden)').val();
            for(num in values){
                if (values[num] !== "") {
                    value += values[num] + ';';
                }
            }
            if(value !== ''){
                value = value.replace(/;$/i, '');
            } else if (useDefault !== undefined && useDefault 
                    && this.defaultValue !== undefined && this.defaultValue !== null) {
                value = this.defaultValue;
            }
        }
        data[this.properties.name] = value;
        PropertyEditor.Util.retrieveHashFieldValue(this, data);
        return data;
    },
    renderField: function() {
        var thisObj = this;
        if(this.value === null){
            this.value = "";
        }

        var size = '';
        if(this.properties.size !== undefined && this.properties.size !== null){
            size = ' size="'+ this.properties.size +'"';
        }

        var html = '<select id="'+ this.id +'" name="'+ this.id +'" multiple'+ size +' class="initChosen">';
        
        PropertyEditor.Util.retrieveOptionsFromCallback(this.properties);

        if(this.properties.options !== undefined && this.properties.options !== null){
            $.each(this.properties.options, function(i, option){
                var selected = "";
                $.each(thisObj.value.split(";"), function(i, v){
                    if(v === option.value){
                        selected = " selected";
                    }
                });
                html += '<option value="'+PropertyEditor.Util.escapeHtmlTag(option.value)+'"'+selected+'>'+PropertyEditor.Util.escapeHtmlTag(option.label)+'</option>';
            });
        }
        html += '</select>';

        return html;
    },
    handleAjaxOptions: function(options, reference) {
        var thisObj = this;
        if (options !== null && options !== undefined) {
            this.properties.options = options;
            
            var values = $("#"+this.id).val();
            if (!$.isArray(values)) {
                values = [values];
            }
            if (values.length === 0 || (values.length === 1 && values[0] === "")) {
                values = thisObj.value.split(";");
            }
            
            var html = "";
            $.each(this.properties.options, function(i, option){
                var selected = "";
                $.each(values, function(i, v){
                    if(v === option.value){
                        selected = " selected";
                    }
                });
                html += '<option value="'+PropertyEditor.Util.escapeHtmlTag(option.value)+'"'+selected+'>'+PropertyEditor.Util.escapeHtmlTag(option.label)+'</option>';
            });
            $("#"+this.id).html(html);
            $("#"+this.id).trigger("change");
            $("#"+this.id).trigger("chosen:updated");
        }
    },
    renderDefault: PropertyEditor.Type.CheckBox.prototype.renderDefault,
    initScripting : PropertyEditor.Type.SelectBox.prototype.initScripting,
    pageShown : PropertyEditor.Type.SelectBox.prototype.pageShown
};
PropertyEditor.Type.MultiSelect = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.MultiSelect.prototype);

PropertyEditor.Type.SortableSelect = function(){};
PropertyEditor.Type.SortableSelect.prototype = {
    shortname : "sortableselect",
    getData: function(useDefault) {
        var data = new Object();
        var value = this.value;
        
        if (this.isDataReady) {
            value = "";
            $('[name='+this.id+']:not(.hidden) option').each(function(){
                value += $(this).attr("value") + ';';
            });
            if(value !== ''){
                value = value.replace(/;$/i, '');
            } else if (useDefault !== undefined && useDefault 
                    && this.defaultValue !== undefined && this.defaultValue !== null) {
                value = this.defaultValue;
            }
        }
        data[this.properties.name] = value;
        PropertyEditor.Util.retrieveHashFieldValue(this, data);
        return data;
    },
    renderField: function() {
        var thisObj = this;
        if(this.value === null){
            this.value = "";
        }

        var size = ' size="8"';
        
        var values = thisObj.value.split(";");

        PropertyEditor.Util.retrieveOptionsFromCallback(this.properties);
        
        var html = '<select id="'+ this.id +'_options" class="options" name="'+ this.id +'_options" multiple'+ size +'>';
        if(this.properties.options !== undefined && this.properties.options !== null){
            $.each(this.properties.options, function(i, option){
                if (option.value !== "") {
                    var selected = "";
                    $.each(values, function(i, v){
                        if(v === option.value){
                            selected = " class=\"selected\"";
                        }
                    });
                    html += '<option value="'+PropertyEditor.Util.escapeHtmlTag(option.value)+'"'+selected+'>'+PropertyEditor.Util.escapeHtmlTag(option.label)+'</option>';
                }
            });
        }
        html += '</select>';
        html += '<div class="sorted_select_control"><button class="selectAll btn"><i class="fa fa-angle-double-right" aria-hidden="true"></i></button><button class="select btn"><i class="fa fa-angle-right" aria-hidden="true"></i></button><button class="unselect btn"><i class="fa fa-angle-left" aria-hidden="true"></i></button><button class="unselectAll btn"><i class="fa fa-angle-double-left" aria-hidden="true"></i></button></div>';
        html += '<select id="'+ this.id +'" name="'+ this.id +'" multiple'+ size +'>';
        if(this.properties.options !== undefined && this.properties.options !== null && values.length > 0){
            $.each(values, function(i, v){
                $.each(this.properties.options, function(i, option){
                    if(v === option.value){
                        html += '<option value="'+PropertyEditor.Util.escapeHtmlTag(option.value)+'">'+PropertyEditor.Util.escapeHtmlTag(option.label)+'</option>';
                    }
                });
            });
        }
        html += '</select>';
        html += '<div class="sorted_select_control sort"><button class="moveup btn"><i class="fa fa-angle-up" aria-hidden="true"></i></button><button class="movedown btn"><i class="fa fa-angle-down" aria-hidden="true"></i></button></div>';
        
        return html;
    },
    handleAjaxOptions: function(options, reference) {
        var thisObj = this;
        if (options !== null && options !== undefined) {
            this.properties.options = options;
            var html = "";
            
            var isInit = true;
            var values = thisObj.value.split(";");
            if ($("#"+thisObj.id+"_options option").length > 0) {
                isInit = false;
                values = [];
                $("#"+thisObj.id + " option").each(function(){
                    values.push($(this).attr("value"));
                });
            }
            
            $.each(this.properties.options, function(i, option){
                if (option.value !== "") {
                    var selected = "";
                    $.each(values, function(i, v){
                        if(v === option.value){
                            selected = " class=\"selected\"";
                        }
                    });
                    html += '<option value="'+PropertyEditor.Util.escapeHtmlTag(option.value)+'"'+selected+'>'+PropertyEditor.Util.escapeHtmlTag(option.label)+'</option>';
                }
            });
            $("#"+thisObj.id+"_options").html(html);
            
            if (isInit) {
                $.each(values, function(i, v){
                    var selected = $("#"+thisObj.id+"_options").find("option[value='"+v+"']");
                    if (selected.length > 0) {
                        var option = $(selected).clone();
                        $("#"+thisObj.id).append(option);
                        $(selected).addClass("selected");
                    }
                });
            } else {
                $("#"+thisObj.id+ "option").each(function() {
                    var value = $(this).attr("value");
                    if ($("#"+thisObj.id+"_options").find("option[value='"+value+"']").length === 0) {
                        $(this).remove();
                    }
                });
                $("#"+thisObj.id+"_options option.selected").each(function(){
                    var value = $(this).attr("value");
                    if ($("#"+thisObj.id).find("option[value='"+value+"']").length === 0) {
                        var option = $(this).clone();
                        $("#"+thisObj.id).append(option);
                    }
                });
            }
            $("#"+thisObj.id).trigger("change");
        }
    },
    renderDefault: PropertyEditor.Type.CheckBox.prototype.renderDefault,
    optionsSelectAll : function() {
        var thisObj = this;
        $("#"+thisObj.id+"_options option").each(function(){
            var value = $(this).attr("value");
            if ($("#"+thisObj.id).find("option[value='"+value+"']").length === 0) {
                var option = $(this).clone();
                $("#"+thisObj.id).append(option);
            }
            $(this).addClass("selected");
        });
    },
    optionsSelect : function() {
        var thisObj = this;
        $("#"+thisObj.id+"_options option:selected").each(function(){
            var value = $(this).attr("value");
            if ($("#"+thisObj.id).find("option[value='"+value+"']").length === 0) {
                var option = $(this).clone();
                $("#"+thisObj.id).append(option);
            }
            $(this).addClass("selected");
        });
    },
    optionsUnselect : function() {
        var thisObj = this;
        $("#"+thisObj.id+" option:selected").each(function(){
            var value = $(this).attr("value");
            $("#"+thisObj.id+"_options").find("option[value='"+value+"']").removeClass("selected");
            $(this).remove();
        });
    },
    optionsUnselectAll : function() {
        var thisObj = this;
        $("#"+thisObj.id+" option").remove();
        $("#"+thisObj.id+"_options option").removeClass("selected");
    },
    optionsMoveUp : function() {
        var thisObj = this;
        $("#"+thisObj.id+" option:selected").each(function(){
            var prev = $(this).prev();
            if (prev !== undefined) {
                $(prev).before($(this));
            }
        });
    },
    optionsMoveDown : function() {
        var thisObj = this;
        $("#"+thisObj.id+" option:selected").each(function(){
            var next = $(this).next();
            if (next !== undefined) {
                $(next).after($(this));
            }
        });
    },
    initScripting: function () {
        var element = $("#"+this.id);
        var container = $(element).parent();
        var field = this;
        
        //selectAll
        $(container).find('button.selectAll').click(function(){
            field.optionsSelectAll();
            element.trigger("change");
            return false;
        });

        //select
        $(container).find('button.select').click(function(){
            field.optionsSelect();
            element.trigger("change");
            return false;
        });

        //unselect
        $(container).find('button.unselect').click(function(){
            field.optionsUnselect();
            element.trigger("change");
            return false;
        });

        //unslectAll
        $(container).find('button.unselectAll').click(function(){
            field.optionsUnselectAll();
            element.trigger("change");
            return false;
        });
        
        //moveup
        $(container).find('button.moveup').click(function(){
            field.optionsMoveUp();
            element.trigger("change");
            return false;
        });
        
        //movedown
        $(container).find('button.movedown').click(function(){
            field.optionsMoveDown();
            element.trigger("change");
            return false;
        });
        
        PropertyEditor.Util.supportHashField(this);
    },
    pageShown: function () {
        //do nothing
    }
};
PropertyEditor.Type.SortableSelect = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.SortableSelect.prototype);

PropertyEditor.Type.Grid = function(){};
PropertyEditor.Type.Grid.prototype = {
    shortname : "grid",
    options_sources: {},
    getData: function(useDefault) {
        var field = this;
        var data = new Object();
        
        if (this.isDataReady) {
            var gridValue = new Array();
            if (!field.isHidden()) {
                $('#'+this.id + ' tr').each(function(tr){
                    var row = $(this);
                    if(!$(row).hasClass("grid_model") && !$(row).hasClass("grid_header")){
                        var obj = new Object();

                        $.each(field.properties.columns, function(i, column){
                            if (column.type !== "truefalse") {
                                obj[column.key] = $(row).find('input[name='+ column.key +'], select[name='+ column.key +']').val();
                                if (obj[column.key] !== null && obj[column.key] !== undefined) {
                                    obj[column.key] = obj[column.key].trim();
                                }
                            } else {
                                if ($(row).find('input[name='+ column.key +']').is(":checked")) {
                                    obj[column.key] = (column.true_value !== undefined)?column.true_value:'true';
                                } else {
                                    obj[column.key] = (column.false_value !== undefined)?column.false_value:'false';
                                }
                            }
                        });
                        gridValue.push(obj);
                    }
                });
                if (gridValue.length === 0 && useDefault !== undefined && useDefault 
                        && this.defaultValue !== null && this.defaultValue !== undefined) {
                    gridValue = this.defaultValue;
                }
                data[this.properties.name] = gridValue;
            }
        } else {
            data[this.properties.name] = this.value;
        }
        
        return data;
    },
    addOnValidation : function (data, errors, checkEncryption) {
        var thisObj = this;
        var wrapper = $('#'+ this.id +'_input');
        var table = $("#"+this.id);
        $(table).find("td").removeClass("error");
                        
        var value = data[this.properties.name];
        var hasError = false;
        if ($.isArray(value) && value.length > 0) {
            $.each(value, function(i, row) {
                $.each(thisObj.properties.columns, function(j, column) {
                    if (column.required !== undefined && column.required.toLowerCase() === 'true') {
                        if (row[column.key] === undefined || row[column.key] === null || row[column.key] === "") {
                            var td = $(table).find("tr:eq("+(i+2)+") td:eq("+j+")");
                            $(td).addClass("error");
                            hasError = true;
                        }
                    }
                });
            });
        }
        
        if(hasError){
            var obj = new Object();
            obj.field = this.properties.name;
            obj.fieldName = this.properties.label;
            obj.message = this.options.mandatoryMessage;
            errors.push(obj);
            $(wrapper).append('<div class="property-input-error">'+ obj.message +'</div>');
        }
    },
    renderField: function() {
        var thisObj = this;
        var html = '<table id="' + this.id + '"><tr class="grid_header">';
        //render header
        $.each(this.properties.columns, function(i, column) {
            var required = "";
            if (column.required !== undefined && column.required.toLowerCase() === 'true') {
                required = ' <span class="property-required">'+get_peditor_msg('peditor.mandatory.symbol')+'</span>';
            }
            html += '<th><span>' + column.label + '</span>' + required + '</th>';
        });
        html += '<th class="property-type-grid-action-column"></th></tr>';

        //render model
        html += '<tr class="grid_model" style="display:none">';
        $.each(this.properties.columns, function(i, column) {
            html += '<td><span>';

            PropertyEditor.Util.retrieveOptionsFromCallback(column);

            if (column.type === "truefalse") {
                column.true_value = (column.true_value !== undefined)?column.true_value:'true';
                html += '<input name="' + column.key + '" type="checkbox" value="'+column.true_value+'"/>';
            } else if (column.options !== undefined || column.options_ajax !== undefined) {
                if (column.type === "autocomplete") {
                    thisObj.updateSource(column.key, column.options);
                    html += '<input name="' + column.key + '" class="autocomplete" size="10" value=""/>';    
                } else {
                    html += '<select name="' + column.key + '" data-value="">';
                    if (column.options !== undefined) {
                        $.each(column.options, function(i, option) {
                            html += '<option value="' + PropertyEditor.Util.escapeHtmlTag(option.value) + '">' + PropertyEditor.Util.escapeHtmlTag(option.label) + '</option>';
                        });
                    }
                    html += '</select>';
                }
            } else {
                html += '<input name="' + column.key + '" size="10" value=""/>';
            }
            html += '</span></td>';
        });
        html += '<td class="property-type-grid-action-column">';
        html += '<a href="#" class="property-type-grid-action-moveup"><span>' + get_peditor_msg('peditor.moveUp') + '</span></a>';
        html += ' <a href="#" class="property-type-grid-action-movedown"><span>' + get_peditor_msg('peditor.moveDown') + '</span></a>';
        html += ' <a href="#" class="property-type-grid-action-delete"><span>' + get_peditor_msg('peditor.delete') + '</span></a>';
        html += '</td></tr>';

        //render value
        if (this.value !== null) {
            $.each(this.value, function(i, row) {
                html += '<tr>';
                $.each(thisObj.properties.columns, function(i, column) {
                    var columnValue = "";
                    if (row[column.key] !== undefined) {
                        columnValue = row[column.key];
                    }

                    html += '<td><span>';
                    if (column.type === "truefalse") {
                        var checked = "";
                        if (columnValue === column.true_value) {
                            checked = "checked";
                        }
                        html += '<input name="' + column.key + '" type="checkbox" '+checked+' value="'+column.true_value+'"/>';
                    } else if (column.options !== undefined || column.options_ajax !== undefined) {
                        if (column.type === "autocomplete") {
                            html += '<input name="' + column.key + '" class="autocomplete" size="10" value="' + PropertyEditor.Util.escapeHtmlTag(columnValue) + '"/>';    
                        } else {
                            html += '<select name="' + column.key + '" data-value="'+columnValue+'" class="initFullWidthChosen">';
                            if (column.options !== undefined) {
                                $.each(column.options, function(i, option) {
                                    var selected = "";
                                    if (columnValue === option.value) {
                                        selected = " selected";
                                    }
                                    html += '<option value="' + PropertyEditor.Util.escapeHtmlTag(option.value) + '"' + selected + '>' + PropertyEditor.Util.escapeHtmlTag(option.label) + '</option>';
                                });
                            }
                            html += '</select>';
                        }
                    } else {
                        html += '<input name="' + column.key + '" size="10" value="' + PropertyEditor.Util.escapeHtmlTag(columnValue) + '"/>';
                    }
                    html += '</span></td>';
                });

                html += '<td class="property-type-grid-action-column">';
                html += '<a href="#" class="property-type-grid-action-moveup"><span>' + get_peditor_msg('peditor.moveUp') + '</span></a>';
                html += ' <a href="#" class="property-type-grid-action-movedown"><span>' + get_peditor_msg('peditor.moveDown') + '</span></a>';
                html += ' <a href="#" class="property-type-grid-action-delete"><span>' + get_peditor_msg('peditor.delete') + '</span></a>';
                html += '</td></tr>';
            });
        }

        html += '</table><a href="#" class="property-type-grid-action-add"><span>' + get_peditor_msg('peditor.add') + '</span></a>';
        return html;
    },
    renderDefault: function() {
        var thisObj = this;
        var defaultValueText = '';
        if (this.defaultValue !== null) {
            $.each(thisObj.defaultValue, function(i, row) {
                $.each(thisObj.properties.columns, function(i, column) {
                    var columnValue = "";
                    if (row[column.key] !== undefined) {
                        columnValue = row[column.key];
                    }

                    if (column.options !== undefined) {
                        $.each(column.options, function(i, option) {
                            if (columnValue === option.value) {
                                defaultValueText += PropertyEditor.Util.escapeHtmlTag(option.label) + '; ';
                            }
                        });
                    } else {
                        defaultValueText += columnValue + '; ';
                    }
                });
                defaultValueText += '<br/>';
            });
        }
        if (defaultValueText !== '') {
            defaultValueText = '<div class="default"><span class="label">' + get_peditor_msg('peditor.default') + '</span><span class="value">' + defaultValueText + '</span><div class="clear"></div></div>';
        }
        return defaultValueText;
    },
    initScripting: function() {
        var table = $("#"+this.id);
        var grid = this;
        
        $(table).find("select.initFullWidthChosen").each(function(){
            $(this).chosen({width: "100%", placeholder_text : " "});
        });
        
        $(table).find("input.autocomplete").each(function(){
            var key = $(this).attr("name");
            $(this).autocomplete({
                source : grid.options_sources[key], 
                minLength : 0,
                open: function(){
                    $(this).autocomplete('widget').css('z-index', 99999);
                    return false;
                }
            });
        });
        
        //add
        $(table).next('a.property-type-grid-action-add').click(function(){
            grid.gridActionAdd(this);
            return false;
        });

        //delete
        $(table).find('a.property-type-grid-action-delete').click(function(){
            grid.gridActionDelete(this);
            table.trigger("change");
            return false;
        });

        //move up
        $(table).find('a.property-type-grid-action-moveup').click(function(){
            grid.gridActionMoveUp(this);
            table.trigger("change");
            return false;
        });

        //move down
        $(table).find('a.property-type-grid-action-movedown').click(function(){
            grid.gridActionMoveDown(this);
            table.trigger("change");
            return false;
        });

        grid.gridDisabledMoveAction(table);
        
        $.each(grid.properties.columns, function(i, column) {
            if (column.options_ajax !== undefined && column.options_ajax !== null) {
                PropertyEditor.Util.handleOptionsField(grid, column.key, column.options_ajax, column.options_ajax_on_change, column.options_ajax_mapping, column.options_ajax_method, column.options_extra);
            }
        });
    },
    handleAjaxOptions: function(options, reference) {
        var grid = this;
        if (options !== null && options !== undefined) {
            if (this.options_sources[reference] !== undefined) {
                this.updateSource(reference, options);
            } else {
                var html = "";
                $.each(options, function(i, option){
                    html += '<option value="'+PropertyEditor.Util.escapeHtmlTag(option.value)+'">'+PropertyEditor.Util.escapeHtmlTag(option.label)+'</option>';
                });
                var change = false;
                $("#"+grid.id+ " [name='"+reference+"']").each(function() {
                    var val = $(this).val(); 
                    if (val === "") {
                        val = $(this).data("value");
                    }
                    $(this).html(html);
                    if ($(this).hasClass("initFullWidthChosen")) {
                        $(this).val(val);
                        $(this).trigger("chosen:updated");
                    }
                    if ($(this).val() !== val) {
                        change = true;
                    }
                });
                if (change) {
                    $("#"+grid.id).trigger("change");
                }
            }
        }
    },
    gridActionAdd: function(object) {
        var grid = this;
        var table = $(object).prev('table');
        var model = $(table).find('.grid_model').html();
        var row = $('<tr>' + model + '</tr>');

        $(row).find("select").each(function(){
            $(this).addClass("initFullWidthChosen");
            $(this).chosen({width: "100%", placeholder_text : " "});
        });
        
        $(row).find("input.autocomplete").each(function(){
            var key = $(this).attr("name");
            $(this).autocomplete({
                source : grid.options_sources[key], 
                minLength : 0,
                open: function(){
                    $(this).autocomplete('widget').css('z-index', 99999);
                    return false;
                }
            });
        });

        $(table).append(row);
        $(row).find('a.property-type-grid-action-delete').click(function(){
            grid.gridActionDelete(this);
            return false;
        });
        $(row).find('a.property-type-grid-action-moveup').click(function(){
            grid.gridActionMoveUp(this);
            return false;
        });
        $(row).find('a.property-type-grid-action-movedown').click(function(){
            grid.gridActionMoveDown(this);
            return false;
        });

        grid.gridDisabledMoveAction(table);
    },
    gridActionDelete: function(object){
        var grid = this;
        var currentRow = $(object).parent().parent();
        var table = $(currentRow).parent();
        $(currentRow).remove();
        grid.gridDisabledMoveAction(table);
    },
    gridActionMoveUp: function(object) {
        var grid = this;
        var currentRow = $(object).parent().parent();
        var prevRow = $(currentRow).prev();
        if(prevRow.attr("id") !== "model"){
            $(currentRow).after(prevRow);
            grid.gridDisabledMoveAction($(currentRow).parent());
        }
    },
    gridActionMoveDown: function(object) {
        var grid = this;
        var currentRow = $(object).parent().parent();
        var nextRow = $(currentRow).next();
        if(nextRow.length > 0){
            $(nextRow).after(currentRow);
            grid.gridDisabledMoveAction($(currentRow).parent());
        }
    },
    gridDisabledMoveAction: function(table) {
        $(table).find('a.property-type-grid-action-moveup').removeClass("disabled");
        $(table).find('a.property-type-grid-action-moveup:eq(1)').addClass("disabled");

        $(table).find('a.property-type-grid-action-movedown').removeClass("disabled");
        $(table).find('a.property-type-grid-action-movedown:last').addClass("disabled");
    },
    updateSource: function(key, options) {
        var thisObj = this;
        this.options_sources[key] = [];
        if (options !== undefined) {
            $.each(options, function(i, option){
                if (option['value'] !== "" && $.inArray(option['value'], thisObj.options_sources[key]) === -1) {
                    thisObj.options_sources[key].push(option['value']);
                }
            });
        }
        this.options_sources[key].sort();
        
        var table = $("#"+this.id);
        $(table).find("input[name='"+key+"'].ui-autocomplete-input").each(function(){
            $(this).autocomplete("option", "source", thisObj.options_sources[key]);
        });
    },
    pageShown: function () {
        $("#"+this.id+" select.initFullWidthChosen").trigger("chosen:updated");
    }
};
PropertyEditor.Type.Grid = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.Grid.prototype);

PropertyEditor.Type.GridCombine = function(){};
PropertyEditor.Type.GridCombine.prototype = {
    shortname : "gridcombine",
    options_sources: {},
    getData: function(useDefault) {
        var field = this;
        var data = new Object();
        
        if (this.isDataReady) {
            if (!field.isHidden()) {
                if ($('#'+this.id + ' tr').length > 2) {
                    $('#'+this.id + ' tr').each(function(tr){
                        var row = $(this);
                        if(!$(row).hasClass("grid_model") && !$(row).hasClass("grid_header")){
                            $.each(field.properties.columns, function(i, column){
                                var value = data[column.key];

                                if (value === undefined) {
                                    value = "";
                                } else {
                                    value += ';';
                                }
                                
                                var fieldValue = "";
                                if (column.type !== "truefalse") {
                                    fieldValue = $(row).find('input[name='+ column.key +'], select[name='+ column.key +']').val();
                                    if (fieldValue === undefined || fieldValue === null) {
                                        fieldValue = "";
                                    }
                                } else {
                                    if ($(row).find('input[name='+ column.key +']').is(":checked")) {
                                        fieldValue = (column.true_value !== undefined)?column.true_value:'true';
                                    } else {
                                        fieldValue = (column.false_value !== undefined)?column.false_value:'false';
                                    }
                                }

                                value += fieldValue.trim();
                                data[column.key] = value;
                            });
                        }
                    });
                } else if (useDefault !== undefined && useDefault) {
                    if (field.options.defaultPropertyValues !== null && field.options.defaultPropertyValues !== undefined) {
                        $.each(field.properties.columns, function(i, column){
                            var temp = field.options.defaultPropertyValues[column.key];
                            if (temp !== undefined) {
                                data[column.key] = temp;
                            }
                        });
                    }
                }
            }
        } else {
            if (field.options.propertyValues !== undefined && field.options.propertyValues !== null) {
                $.each(field.properties.columns, function(i, column) {
                    var temp = field.options.propertyValues[column.key];
                    data[column.key] = temp;
                });
            }
        }
        return data;
    },
    addOnValidation : function (data, errors, checkEncryption) {
        var thisObj = this;
        var wrapper = $('#'+ this.id +'_input');
        var table = $("#"+this.id);
        $(table).find("td").removeClass("error");
                        
        var hasError = false;
        if (data !== undefined && data !== null) {
            $.each(thisObj.properties.columns, function(j, column) {
                if (column.required !== undefined && column.required.toLowerCase() === 'true') {
                    var temp = data[column.key];
                    if (temp !== undefined) {
                        var temp_arr = temp.split(";");

                        $.each(temp_arr, function(i, row) {
                            if (row === "") {
                                var td = $(table).find("tr:eq("+(i+2)+") td:eq("+j+")");
                                $(td).addClass("error");
                                hasError = true;
                            }
                        });
                    }
                }
            });
        }
        
        if(hasError){
            var obj = new Object();
            obj.field = this.properties.name;
            obj.fieldName = this.properties.label;
            obj.message = this.options.mandatoryMessage;
            errors.push(obj);
            $(wrapper).append('<div class="property-input-error">'+ obj.message +'</div>');
        }
    },
    renderField: function() {
        var thisObj = this;
        var html = '<table id="' + this.id + '"><tr class="grid_header">';
        //render header
        $.each(this.properties.columns, function(i, column) {
            var required = "";
            if (column.required !== undefined && column.required.toLowerCase() === 'true') {
                required = ' <span class="property-required">'+get_peditor_msg('peditor.mandatory.symbol')+'</span>';
            }
            html += '<th><span>' + column.label + '</span>' + required + '</th>';
        });
        html += '<th class="property-type-grid-action-column"></th></tr>';

        //render model
        html += '<tr class="grid_model" style="display:none">';
        $.each(this.properties.columns, function(i, column) {
            html += '<td><span>';

            PropertyEditor.Util.retrieveOptionsFromCallback(column);

            if (column.type === "truefalse") {
                column.true_value = (column.true_value !== undefined)?column.true_value:'true';
                html += '<input name="' + column.key + '" type="checkbox" value="'+column.true_value+'"/>';
            } else if (column.options !== undefined || column.options_ajax !== undefined) {
                if (column.type === "autocomplete") {
                    thisObj.updateSource(column.key, column.options);
                    html += '<input name="' + column.key + '" class="autocomplete" size="10" value=""/>';    
                } else {
                    html += '<select name="' + column.key + '" data-value="">';
                    if (column.options !== undefined) {
                        $.each(column.options, function(i, option) {
                            html += '<option value="' + PropertyEditor.Util.escapeHtmlTag(option.value) + '">' + PropertyEditor.Util.escapeHtmlTag(option.label) + '</option>';
                        });
                    }
                    html += '</select>';
                }
            } else {
                html += '<input name="' + column.key + '" size="10" value=""/>';
            }
            html += '</span></td>';
        });
        html += '<td class="property-type-grid-action-column">';
        html += '<a href="#" class="property-type-grid-action-moveup"><span>' + get_peditor_msg('peditor.moveUp') + '</span></a>';
        html += ' <a href="#" class="property-type-grid-action-movedown"><span>' + get_peditor_msg('peditor.moveDown') + '</span></a>';
        html += ' <a href="#" class="property-type-grid-action-delete"><span>' + get_peditor_msg('peditor.delete') + '</span></a>';
        html += '</td></tr>';

        var values = new Array();
        if (thisObj.options.propertyValues !== undefined && thisObj.options.propertyValues !== null) {
            $.each(this.properties.columns, function(i, column) {
                var temp = thisObj.options.propertyValues[column.key];
                if (temp !== undefined) {
                    var temp_arr = temp.split(";");

                    $.each(temp_arr, function(i, row) {
                        if (values[i] === null || values[i] === undefined) {
                            values[i] = new Object();
                        }
                        values[i][column.key] = row;
                    });
                }
            });
        }

        //render value
        if (values.length > 0) {
            $.each(values, function(i, row) {
                html += '<tr>';
                $.each(thisObj.properties.columns, function(i, column) {
                    var columnValue = "";
                    if (row[column.key] !== undefined) {
                        columnValue = row[column.key];
                    }

                    html += '<td><span>';
                    if (column.type === "truefalse") {
                        var checked = "";
                        if ((columnValue === column.true_value)) {
                            checked = "checked";
                        }
                        html += '<input name="' + column.key + '" type="checkbox" '+checked+' value="'+column.true_value+'"/>';
                    } else if (column.options !== undefined || column.options_ajax !== undefined) {
                        if (column.type === "autocomplete") {
                            html += '<input name="' + column.key + '" class="autocomplete" size="10" value="' + PropertyEditor.Util.escapeHtmlTag(columnValue) + '"/>';    
                        } else {
                            html += '<select name="' + column.key + '" data-value="'+columnValue+'" class="initFullWidthChosen">';
                            if (column.options !== undefined) {
                                $.each(column.options, function(i, option) {
                                    var selected = "";
                                    if (columnValue === option.value) {
                                        selected = " selected";
                                    }
                                    html += '<option value="' + PropertyEditor.Util.escapeHtmlTag(option.value) + '"' + selected + '>' + PropertyEditor.Util.escapeHtmlTag(option.label) + '</option>';
                                });
                            }
                            html += '</select>';
                        }
                    } else {
                        html += '<input name="' + column.key + '" size="10" value="' + PropertyEditor.Util.escapeHtmlTag(columnValue) + '"/>';
                    }
                    html += '</span></td>';
                });

                html += '<td class="property-type-grid-action-column">';
                html += '<a href="#" class="property-type-grid-action-moveup"><span>' + get_peditor_msg('peditor.moveUp') + '</span></a>';
                html += ' <a href="#" class="property-type-grid-action-movedown"><span>' + get_peditor_msg('peditor.moveDown') + '</span></a>';
                html += ' <a href="#" class="property-type-grid-action-delete"><span>' + get_peditor_msg('peditor.delete') + '</span></a>';
                html += '</td></tr>';
            });
        }
        
        html += '</table><a href="#" class="property-type-grid-action-add"><span>' + get_peditor_msg('peditor.add') + '</span></a>';
        return html;
    },
    renderDefault: function() {
        var thisObj = this;
        var defaultValueText = '';
        
        var defaultValues = new Array();
        if (thisObj.options.defaultPropertyValues !== null && thisObj.options.defaultPropertyValues !== undefined) {
            $.each(thisObj.properties.columns, function(i, column){
                var temp = thisObj.options.defaultPropertyValues[column.key];
                if (temp !== undefined) {
                    var temp_arr = temp.split(";");

                    $.each(temp_arr, function(i, row){
                        if (defaultValues[i] === null) {
                            defaultValues[i] = new Object();
                        }
                        defaultValues[i][column.key] = row;
                    });
                }
            });
        }
        
        if(defaultValues !== null){
            $.each(defaultValues, function(i, row){
                $.each(thisObj.properties.columns, function(i, column){
                    var columnValue = "";
                    if(row[column.key] !== undefined){
                        columnValue = row[column.key];
                    }

                    if(column.options !== undefined){
                        $.each(column.options, function(i, option){
                            if(columnValue === option.value){
                                defaultValueText +=  PropertyEditor.Util.escapeHtmlTag(option.label) + '; ';
                            }
                        });
                    }else{
                        defaultValueText += columnValue + '; ';
                    }
                });
                defaultValueText += '<br/>';
            });
        }
        if(defaultValueText !== ''){
            defaultValueText = '<div class="default"><span class="label">'+get_peditor_msg('peditor.default')+'</span><span class="value">'+ defaultValueText +'</span><div class="clear"></div></div>';
        }
        return defaultValueText;
    },
    initScripting: PropertyEditor.Type.Grid.prototype.initScripting,
    gridActionAdd: PropertyEditor.Type.Grid.prototype.gridActionAdd,
    gridActionDelete: PropertyEditor.Type.Grid.prototype.gridActionDelete, 
    gridActionMoveUp: PropertyEditor.Type.Grid.prototype.gridActionMoveUp,
    gridActionMoveDown: PropertyEditor.Type.Grid.prototype.gridActionMoveDown,
    gridDisabledMoveAction: PropertyEditor.Type.Grid.prototype.gridDisabledMoveAction,
    pageShown: PropertyEditor.Type.Grid.prototype.pageShown,
    handleAjaxOptions: PropertyEditor.Type.Grid.prototype.handleAjaxOptions,
    updateSource: PropertyEditor.Type.Grid.prototype.updateSource
};
PropertyEditor.Type.GridCombine = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.GridCombine.prototype);

PropertyEditor.Type.GridFixedRow = function(){};
PropertyEditor.Type.GridFixedRow.prototype = {
    shortname : "gridfixedrow",
    options_sources: {},
    getData: PropertyEditor.Type.Grid.prototype.getData,
    addOnValidation : function (data, errors, checkEncryption) {
        var thisObj = this;
        var wrapper = $('#'+ this.id +'_input');
        var table = $("#"+this.id);
        $(table).find("td").removeClass("error");
                        
        var value = data[this.properties.name];
        
        var hasError = false;
        if (thisObj.properties.rows !== null) {
            $.each(thisObj.properties.rows, function(i, row) {
                if (row.required !== undefined && row.required.toLowerCase() === 'true') {
                    $.each(thisObj.properties.columns, function(j, column) {
                        if (column.required !== undefined && column.required.toLowerCase() === 'true') {
                            if (value[i] === undefined || value[i] === null 
                                    || value[i][column.key] === undefined || value[i][column.key] === null || value[i][column.key] === "") {
                                var td = $(table).find("tr:eq("+(i+1)+") td:eq("+j+")");
                                $(td).addClass("error");
                                hasError = true;
                            }
                        }
                    });
                }
            });
        }
        
        if(hasError){
            var obj = new Object();
            obj.field = this.properties.name;
            obj.fieldName = this.properties.label;
            obj.message = this.options.mandatoryMessage;
            errors.push(obj);
            $(wrapper).append('<div class="property-input-error">'+ obj.message +'</div>');
        }
    },
    renderField: function() {
        var thisObj = this;
        var html = '<table id="' + this.id + '"><tr class="grid_header">';
        //render header
        $.each(this.properties.columns, function(i, column) {
            var required = "";
            if (column.required !== undefined && column.required.toLowerCase() === 'true') {
                required = ' <span class="property-required">'+get_peditor_msg('peditor.mandatory.symbol')+'</span>';
            }
            html += '<th><span>' + column.label + '</span>' + required + '</th>';
        });
        html += '<th class="property-type-grid-action-column"></th></tr>';

        //render value
        if (thisObj.properties.rows !== null) {
            $.each(thisObj.properties.rows, function(i, row) {
                html += '<tr>';
                $.each(thisObj.properties.columns, function(j, column) {
                    if (j === 0) { //first column to display Row label
                        var required = "";
                        if (row.required !== undefined && row.required.toLowerCase() === 'true') {
                            required = ' <span class="property-required">'+get_peditor_msg('peditor.mandatory.symbol')+'</span>';
                        }
                        
                        html += '<td><span>' + row.label + '</span>' + required;
                        html += '<input type="hidden" name="' + column.key + '" value="' + PropertyEditor.Util.escapeHtmlTag(row.label) + '"/></td>';
                    } else {
                        var columnValue = "";
                        if (thisObj.value !== undefined && thisObj.value !== null 
                                && thisObj.value[i] !== undefined && thisObj.value[i] !== null 
                                && thisObj.value[i][column.key] !== undefined) {
                            columnValue = thisObj.value[i][column.key];
                        }
                        
                        PropertyEditor.Util.retrieveOptionsFromCallback(column);

                        html += '<td><span>';
                        if (column.type === "truefalse") {
                            var checked = "";
                            column.true_value = (column.true_value !== undefined)?column.true_value:'true';
                            if (columnValue === column.true_value) {
                                checked = "checked";
                            }
                            html += '<input name="' + column.key + '" type="checkbox" '+checked+' value="'+column.true_value+'"/>';
                        } else if (column.options !== undefined || column.options_ajax !== undefined) {
                            if (column.type === "autocomplete") {
                                if (i === 0) {
                                    thisObj.updateSource(column.key, column.options);
                                }
                                html += '<input name="' + column.key + '" class="autocomplete" size="10" value="' + PropertyEditor.Util.escapeHtmlTag(columnValue) + '"/>';    
                            } else {
                                html += '<select name="' + column.key + '" data-value="'+columnValue+'" class="initFullWidthChosen">';
                                if (column.options !== undefined){
                                    $.each(column.options, function(i, option) {
                                        var selected = "";
                                        if (columnValue === option.value) {
                                            selected = " selected";
                                        }
                                        html += '<option value="' + PropertyEditor.Util.escapeHtmlTag(option.value) + '"' + selected + '>' + PropertyEditor.Util.escapeHtmlTag(option.label) + '</option>';
                                    });
                                }
                                html += '</select>';
                            }
                        } else {
                            html += '<input name="' + column.key + '" size="10" value="' + PropertyEditor.Util.escapeHtmlTag(columnValue) + '"/>';
                        }
                        html += '</span></td>';
                    }
                });

                html += '</tr>';
            });
        }

        html += '</table>';
        return html;
    },
    renderDefault: PropertyEditor.Type.Grid.prototype.renderDefault,
    initScripting: function() {
        var table = $("#"+this.id);
        var grid = this;
        
        $(table).find("select.initFullWidthChosen").each(function(){
            $(this).chosen({width: "100%", placeholder_text : " "});
        });
        
        $(table).find("input.autocomplete").each(function(){
            var key = $(this).attr("name");
            $(this).autocomplete({
                source : grid.options_sources[key], 
                minLength : 0,
                open: function(){
                    $(this).autocomplete('widget').css('z-index', 99999);
                    return false;
                }
            });
        });
        
        $.each(grid.properties.columns, function(i, column) {
            if (column.options_ajax !== undefined && column.options_ajax !== null) {
                PropertyEditor.Util.handleOptionsField(grid, column.key, column.options_ajax, column.options_ajax_on_change, column.options_ajax_mapping, column.options_ajax_method, column.options_extra);
            }
        });
    },
    pageShown: PropertyEditor.Type.Grid.prototype.pageShown,
    handleAjaxOptions: PropertyEditor.Type.Grid.prototype.handleAjaxOptions,
    updateSource: PropertyEditor.Type.Grid.prototype.updateSource
};
PropertyEditor.Type.GridFixedRow = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.GridFixedRow.prototype);

PropertyEditor.Type.HtmlEditor = function(){};
PropertyEditor.Type.HtmlEditor.prototype = {
    tinyMceInitialed : false,
    shortname : "htmleditor",
    getData: function(useDefault) {
        var data = new Object();
        var value = $('[name='+this.id+']:not(.hidden)').html().trim();
        if (value === undefined || value === null || value === "") {
            if (useDefault !== undefined && useDefault 
                    && this.defaultValue !== undefined && this.defaultValue !== null) {
                value = this.defaultValue;
            }
        }
        data[this.properties.name] = value;
        return data;
    },
    renderField: function() {
        var rows = ' rows="15"';
        if(this.properties.rows !== undefined && this.properties.rows !== null){
            rows = ' rows="'+ this.properties.rows +'"';
        }
        var cols = ' cols="60"';
        if(this.properties.cols !== undefined && this.properties.cols !== null){
            cols = ' cols="'+ this.properties.cols +'"';
        }

        if(this.value === null){
            this.value = "";
        }
        return '<textarea id="'+ this.id + '" name="'+ this.id + '" class="tinymce"'+rows +cols+'>'+ PropertyEditor.Util.escapeHtmlTag(this.value) +'</textarea>';
    },
    initScripting: function() {
        //if tinymce ald exist, using command to init it
        if(PropertyEditor.Type.HtmlEditor.prototype.tinyMceInitialed && window['tinymce'] !== undefined){
            window['tinymce'].execCommand('mceAddControl', false, this.id);
        }else{
            if (this.options.tinyMceScript !== '') {
                $('#'+this.id).tinymce({
                    // Location of TinyMCE script
                    script_url : this.options.tinyMceScript,

                    // General options
                    convert_urls : false,
                    theme : "advanced",
                    plugins : "layer,table,save,advimage,advlink,emotions,iespell,inlinepopups,insertdatetime,preview,media,searchreplace,contextmenu,paste,noneditable,xhtmlxtras,template,advlist",

                    // Theme options
                    theme_advanced_buttons1 : "cleanup,code,|,undo,redo,|,cut,copy,paste|,search,replace,|,bullist,numlist,|,outdent,indent",
                    theme_advanced_buttons2 : "bold,italic,underline,strikethrough,|,forecolor,backcolor,|,justifyleft,justifycenter,justifyright,justifyfull,|,sub,sup,|,insertdate,inserttime,charmap,iespell",
                    theme_advanced_buttons3 : "formatselect,fontselect,fontsizeselect,|,hr,removeformat,blockquote,|,link,unlink,image,media",
                    theme_advanced_buttons4 : "tablecontrols,|,visualaid,insertlayer,moveforward,movebackward,absolute",
                    theme_advanced_toolbar_location : "top",
                    theme_advanced_toolbar_align : "left",
                    theme_advanced_statusbar_location : "bottom",

                    valid_elements : "+*[*]",

                    height : "300px",
                    width : "95%"
                });
                PropertyEditor.Type.HtmlEditor.prototype.tinyMceInitialed = true;
            }
        }
    }
};
PropertyEditor.Type.HtmlEditor = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.HtmlEditor.prototype);

PropertyEditor.Type.CodeEditor = function(){};
PropertyEditor.Type.CodeEditor.prototype = {
    codeeditor : null,
    shortname : "codeeditor",
    getData: function(useDefault) {
        var data = new Object();
        if (!this.isHidden()) {
            var value = this.codeeditor.getValue();
            if (value === undefined || value === null || value === "") {
                if (useDefault !== undefined && useDefault 
                        && this.defaultValue !== undefined && this.defaultValue !== null) {
                    value = this.defaultValue;
                }
            }
            data[this.properties.name] = value;
        }
        return data;
    },
    renderField: function() {
        return '<pre id="'+ this.id + '" name="'+ this.id + '" class="ace_editor"></pre>';
    },
    initScripting: function() {
        if(this.value === null){
            this.value = "";
        }
        this.codeeditor = ace.edit(this.id);
        this.codeeditor.setValue(this.value);
        this.codeeditor.getSession().setTabSize(4);
        if (this.properties.theme !== undefined || this.properties.theme !== "") {
            this.properties.theme = "textmate";
        }
        this.codeeditor.setTheme("ace/theme/"+this.properties.theme);
        if (this.properties.mode !== undefined || this.properties.mode !== "") {
            this.codeeditor.getSession().setMode("ace/mode/"+this.properties.mode);
        }
        this.codeeditor.setAutoScrollEditorIntoView(true);
        this.codeeditor.setOption("maxLines", 1000000); //unlimited, to fix the height issue
        this.codeeditor.setOption("minLines", 10);
        this.codeeditor.resize();
    },
    pageShown: function() {
        this.codeeditor.resize();
        this.codeeditor.gotoLine(1);
    }
};
PropertyEditor.Type.CodeEditor = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.CodeEditor.prototype);

PropertyEditor.Type.ElementSelect = function(){};
PropertyEditor.Type.ElementSelect.prototype = {
    shortname : "elementselect",
    initialize: function() {
        this.options = jQuery.extend({}, this.options);
        this.options.defaultPropertyValues = null;
        this.options.propertiesDefinition = null;
        if(this.value !== null){
            this.options.propertyValues = this.value.properties;
        } else {
            this.options.propertyValues = null;
        }
    },
    getData: function(useDefault) {
        var thisObj = this;
        var data = new Object();
        
        if (this.isDataReady) {
            var element = new Object();
            element['className'] = $('[name='+this.id+']:not(.hidden)').val();
            element['properties'] = new Object();

            if(this.options.propertiesDefinition !== undefined && this.options.propertiesDefinition !== null){
                $.each(this.options.propertiesDefinition, function(i, page){
                    var p = page.propertyEditorObject;
                    element['properties'] = $.extend(element['properties'], p.getData());
                });
            }

            if (element['className'] === "" && useDefault !== undefined && useDefault 
                    && this.defaultValue !== undefined && this.defaultValue !== null) {
                element = this.defaultValue;
            }

            data[this.properties.name] = element;
        } else {
            data[this.properties.name] = this.value;
        }
        return data;
    },
    validate : function (data, errors, checkEncryption) {
        var wrapper = $('#'+ this.id +'_input');
        
        var value = data[this.properties.name];
        var deferreds = [];
        var defaultValue = null;

        if(this.defaultValue !== undefined && this.defaultValue !== null && this.defaultValue.className !== ""){
            defaultValue = this.defaultValue;
        }
        
        if(this.properties.required !== undefined && this.properties.required.toLowerCase() === "true" 
                && value.className === '' && defaultValue === null){
            var obj = new Object();
            obj.field = this.properties.name;
            obj.fieldName = this.properties.label;
            obj.message = this.options.mandatoryMessage;
            errors.push(obj);
            $(wrapper).append('<div class="property-input-error">'+ obj.message +'</div>');
        }
        
        if(this.options.propertiesDefinition !== undefined && this.options.propertiesDefinition !== null){
            $.each(this.options.propertiesDefinition, function(i, page){
                var p = page.propertyEditorObject;
                var deffers = p.validate(value['properties'], errors, true);
                if (deffers !== null && deffers !== undefined && deffers.length > 0) {
                    deferreds = $.merge(deferreds, deffers);
                }
            });
        }
        return deferreds;
    },
    renderField: function() {
        var html = '<select id="'+ this.id +'" name="'+ this.id +'" class="initChosen">';
        var valueString = "";
        if (this.value !== null && ((typeof this.value) ===  "string")) {
            var temp = this.value;
            this.value = {};
            this.value.className = temp;
        }
        if(this.value !== null){
            valueString = this.value.className;
        }
        
        PropertyEditor.Util.retrieveOptionsFromCallback(this.properties);
        
        if(this.properties.options !== undefined && this.properties.options !== null){
            $.each(this.properties.options, function(i, option){
                var selected = "";
                if(valueString === option.value){
                    selected = " selected";
                }
                html += '<option value="'+PropertyEditor.Util.escapeHtmlTag(option.value)+'"'+selected+'>'+PropertyEditor.Util.escapeHtmlTag(option.label)+'</option>';
            });
        }
        html += '</select>';
        return html;
    },
    renderDefault: function() {
        var defaultValueText = '';
        var defaultValueString = '';
        if(this.defaultValue !== null && this.defaultValue !== undefined){
            defaultValueString = this.defaultValue.classname;
            
            if(this.properties.options !== undefined && this.properties.options !== null){
                $.each(this.properties.options, function(i, option){
                    if(defaultValueString !== "" && defaultValueString === option.value){
                        defaultValueText = PropertyEditor.Util.escapeHtmlTag(option.label);
                    }
                });
            }
        }
        if(defaultValueText !== ''){
            defaultValueText = '<div class="default"><span class="label">'+get_peditor_msg('peditor.default')+'</span><span class="value">' + defaultValueText + '</span><div class="clear"></div></div>';
        }
        return defaultValueText;
    },
    pageShown : PropertyEditor.Type.SelectBox.prototype.pageShown,
    handleAjaxOptions: function(options, reference) {
        var thisObj = this;
        if (options !== null && options !== undefined) {
            this.properties.options = options;
            var value = "";
            var html = "";
            
            value = $("#"+this.id).val();
            if ((value === "" || value === null) && thisObj.value !== undefined && thisObj.value !== null) {
                value = thisObj.value.className;
            }
            
            $.each(this.properties.options, function(i, option){
                var selected = "";
                if(value === option.value){
                    selected = " selected";
                }
                html += '<option value="'+PropertyEditor.Util.escapeHtmlTag(option.value)+'"'+selected+'>'+PropertyEditor.Util.escapeHtmlTag(option.label)+'</option>';
            });
            $("#"+this.id).html(html);
            $("#"+this.id).trigger("change");
            $("#"+this.id).trigger("chosen:updated");
        }
    },
    initScripting: function () {
        var thisObj = this;
        var field = $("#"+this.id);
        
        $(field).chosen({width: "54%", placeholder_text : " "});
        
        if(!$(field).hasClass("hidden") && $(field).val() !== undefined 
                && $(field).val() !== null && this.properties.options !== undefined 
                && this.properties.options !== null && this.properties.options.length > 0){
            this.renderPages();
        }
        
        $(field).change(function(){
            thisObj.renderPages();
        });
    },
    renderPages: function() {
        var thisObj = this;
        var field = $("#"+this.id);
        var value = $(field).filter(":not(.hidden)").val();
        var currentPage = $(this.editor).find("#"+this.page.id);
        
        var data = null;
        if (this.properties.keep_value_on_change !== undefined && this.properties.keep_value_on_change.toLowerCase() === "true") {
            if (this.options.propertiesDefinition !== undefined && this.options.propertiesDefinition !== null) {
                data = this.getData();
                this.options.propertyValues = data[this.properties.name].properties;
            } else {
                this.options.propertyValues = (this.value) ? this.value.properties : null;
            }
        }
        
        //check if value is different, remove all the related properties page
        if($(this.editor).find('.property-editor-page[elementId='+this.id+']:first').attr('elementValue') !== value){
            this.removePages();
            thisObj.editorObject.refresh();
        }
        
        //if properties page not found, render it now
        if($(this.editor).find('.property-editor-page[elementId='+this.id+']').length === 0){
            var deferreds = [];
            deferreds.push(this.getElementProperties(value));
            deferreds.push(this.getElementDefaultProperties(value));
            $.when.apply($, deferreds).then(function(){
                if(thisObj.options.propertiesDefinition !== undefined && thisObj.options.propertiesDefinition !== null){
                    var parentId = thisObj.properties.name;
                    var elementdata = ' elementId="'+ thisObj.id+'" elementValue="'+ value +'"';

                    //check if the element has a parent element
                    if (currentPage.attr("elementId") !== undefined && currentPage.attr("elementId") !== "") {
                        parentId = currentPage.attr("elementId") + "_" + parentId;
                        if (currentPage.attr("parentElementId") !== undefined && currentPage.attr("parentElementId") !== "") {
                            elementdata += ' parentElementId="' + currentPage.attr("parentElementId") + '"'; 
                        } else {
                            elementdata += ' parentElementId="' + currentPage.attr("elementId") + '"'; 
                        }
                    }

                    var html = "";
                    $.each(thisObj.options.propertiesDefinition, function(i, page){
                        var p = page.propertyEditorObject;
                        if (p === undefined) {        
                            p = new PropertyEditor.Model.Page(thisObj.editorObject, i, page, elementdata, parentId);
                            p.options = thisObj.options;
                            page.propertyEditorObject = p;
                            thisObj.editorObject.pages[p.id] = p;
                        }
                        html += p.render();
                    });
                    $(currentPage).after(html);

                    $.each(thisObj.options.propertiesDefinition, function(i, page){
                        var p = page.propertyEditorObject;
                        if (p === undefined) {        
                            p = new PropertyEditor.Model.Page(thisObj.editorObject, i, page, elementdata, parentId);
                            page.propertyEditorObject = p;
                            thisObj.editorObject.pages[p.id] = p;
                        }
                        html += p.render();
                    });
                
                    $.each(thisObj.options.propertiesDefinition, function(i, page){
                        var p = page.propertyEditorObject;
                        p.initScripting();
                    });
                    
                    thisObj.editorObject.refresh();
                }
            });
        }
    },
    getElementProperties: function(value) {
        var thisObj = this;
        var d = $.Deferred();
        
        $.ajax({
            url: PropertyEditor.Util.replaceContextPath(this.properties.url, this.options.contextPath),
            data : "value="+escape(value),
            dataType : "text",
            success: function(response) {
                if(response !== null && response !== undefined && response !== ""){
                    var data = eval(response);
                    thisObj.options.propertiesDefinition = data;
                } else {
                    thisObj.options.propertiesDefinition = null;
                }
                d.resolve();
            }
        });
        
        return d;
    },
    getElementDefaultProperties: function(value) {
        var thisObj = this;
        var d = $.Deferred();
        
        if (this.properties.default_property_values_url !== null && this.properties.default_property_values_url !== undefined 
                && this.properties.default_property_values_url !== "") {
            $.ajax({
                url: PropertyEditor.Util.replaceContextPath(this.properties.default_property_values_url, this.options.contextPath),
                data : "value="+escape(value),
                dataType : "text",
                success: function(response) {
                    if(response !== null && response !== undefined && response !== ""){
                        var data = $.parseJSON(response);
                        thisObj.options.defaultPropertyValues = data;
                    } else {
                        thisObj.options.defaultPropertyValues = null;
                    }
                    d.resolve();
                }
            });
        } else {
            d.resolve();
        }
        
        return d;
    },
    removePages: function() {
        if(this.options.propertiesDefinition !== undefined && this.options.propertiesDefinition !== null){
            $.each(this.options.propertiesDefinition, function(i, page){
                var p = page.propertyEditorObject;
                p.remove();
            });
        }
    },
    remove: function() {
        this.removePages();
    }
};
PropertyEditor.Type.ElementSelect = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.ElementSelect.prototype);

PropertyEditor.Type.AutoComplete = function(){};
PropertyEditor.Type.AutoComplete.prototype = {
    shortname : "autocomplete",
    source : [],
    renderField: function() {
        var size = '';
        if(this.value === null){
            this.value = "";
        }
        if(this.properties.size !== undefined && this.properties.size !== null){
            size = ' size="'+ this.properties.size +'"';
        } else {
            size = ' size="50"';
        }
        var maxlength = '';
        if(this.properties.maxlength !== undefined && this.properties.maxlength !== null){
            maxlength = ' maxlength="'+ this.properties.maxlength +'"';
        }
        
        PropertyEditor.Util.retrieveOptionsFromCallback(this.properties);
        this.updateSource();
        
        return '<input type="text" class="autocomplete" id="'+ this.id + '" name="'+ this.id + '"'+ size + maxlength +' value="'+ PropertyEditor.Util.escapeHtmlTag(this.value) +'"/>';
    },
    handleAjaxOptions: function(options, reference) {
        this.properties.options = options;
        this.updateSource();
    },
    updateSource: function() {
        var thisObj = this;
        this.source = [];
        if (this.properties.options !== undefined) {
            $.each(this.properties.options, function(i, option){
                if (option['value'] !== "" && $.inArray(option['value'], thisObj.source) === -1) {
                    thisObj.source.push(option['value']);
                }
            });
        }
        this.source.sort();
        $("#"+this.id).autocomplete("option", "source", this.source);
    },
    initScripting: function () {
        var thisObj = this;
        $("#"+this.id).autocomplete({
            source : thisObj.source, 
            minLength : 0,
            open: function(){
                $(this).autocomplete('widget').css('z-index', 99999);
                return false;
            }
        });
    }
};
PropertyEditor.Type.AutoComplete = PropertyEditor.Util.inherit( PropertyEditor.Model.Type, PropertyEditor.Type.AutoComplete.prototype);

(function($) {
    $.fn.extend({
        propertyEditor : function(options){
            var defaults = {
                contextPath : '',
                tinyMceScript : '',
                saveCallback : null,
                cancelCallback : null,
                validationFailedCallback : null,
                saveButtonLabel : get_peditor_msg('peditor.ok'),
                cancelButtonLabel : get_peditor_msg('peditor.cancel'),
                nextPageButtonLabel : get_peditor_msg('peditor.next'),
                previousPageButtonLabel : get_peditor_msg('peditor.prev'),
                showCancelButton: false,
                closeAfterSaved: true,
                showDescriptionAsToolTip: false,
                mandatoryMessage: get_peditor_msg('peditor.mandatory'),
                skipValidation:false
            };
            var o =  $.extend(true, defaults, options);
            $.ajaxSetup ({
                cache: false
            });
            
            var element = null;
            if (this.length > 1) {
                element = $(this[this.length - 1]);
            } else {
                element = $(this[0]);
            }
            
            return element.each(function() {
                var editor = new PropertyEditor.Model.Editor(this, o);
                editor.render();
                return false;
            });
        },
        hashVariableAssitant : function (contextPath) {
            var container = this;
            
            var showHashVariableAssit = function (field, caret, syntax) {
                var html = "<div class=\"property_editor_hashassit\">";
                html += "<input type=\"text\" id=\"property_editor_hashassit_input\" class=\"hashassit_input\" style=\"width:90%\"/>";
                html += "</div>";
                
                var object = $(html);
                $(object).dialog({
                    autoOpen: false, 
                    modal: true, 
                    height: 85,
                    close: function( event, ui ) {
                        $(object).dialog("destroy");
                        $(object).remove();
                        $(field).focus();
                    }
                });
                
                $.ajax({
                    url: contextPath + '/web/json/hash/options',
                    dataType: "text",
                    success: function(data) {
                        if(data !== undefined && data !== null){
                            var options = $.parseJSON(data);
                            $(object).find(".hashassit_input").autocomplete({
                                source : options, 
                                minLength : 0,
                                open: function(){
                                    $(this).autocomplete('widget').css('z-index', 99999);
                                    return false;
                                }
                            }).focus(function(){ 
                                $(this).data("uiAutocomplete").search($(this).val());
                            }).keydown(function(e){
                                var autocomplete = $(this).autocomplete("widget");
                                if(e.which === 13 && $(autocomplete).is(":hidden")) {
                                    var text = $(this).val();
                                    if (text.length > 0) {
                                        if (syntax === "#") {
                                            text = "#" + text + "#";
                                        } else {
                                            text = "{" + text + "}";
                                        }
                                        if ($(field).hasClass("ace_text-input")) {
                                            var id = $(field).closest(".ace_editor").attr("id");
                                            var codeeditor = ace.edit(id);
                                            codeeditor.insert(text);
                                        } else {
                                            var org = $(field).val();
                                            var output = [org.slice(0, caret), text, org.slice(caret)].join('');
                                            $(field).val(output);
                                        }
                                    }
                                    $(object).dialog("close");
                                }
                            });
                            $(object).dialog("open");
                            $(object).find(".hashassit_input").val("").focus();
                        } else {
                            $(object).dialog("destroy");
                            $(object).remove();
                            $(field).focus();
                        }
                    }
                });
            };
            
            var doGetCaretPosition = function (oField) {
                // Initialize
                var iCaretPos = 0;

                // IE Support
                if (document.selection) {
                    // Set focus on the element
                    oField.focus ();
                    // To get cursor position, get empty selection range
                    var oSel = document.selection.createRange ();
                    // Move selection start to 0 position
                    oSel.moveStart ('character', -oField.value.length);
                    // The caret position is selection length
                    iCaretPos = oSel.text.length;
                } else if (oField.selectionStart || oField.selectionStart === '0') // Firefox support
                    iCaretPos = oField.selectionStart;

                // Return results
                return (iCaretPos);
            };
            
            var keys = {};
            $(container).keydown(function(e){
                keys[e.which] = true;
                if (keys[17] === true && keys[16] === true && (keys[51] === true || keys[219] === true)) {
                    var element = $(container).find(":focus");
                    showHashVariableAssit(element, doGetCaretPosition(element[0]), (keys[51] === true)?"#":"{");
                    keys = {};
                }
            }).keyup(function(e){
                delete keys[e.which];
            });
        }
    });    
})(jQuery);