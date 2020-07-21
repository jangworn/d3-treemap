
var width = $(document).width();
var height = $(document).height();

var tree;
var container;
var linkContainer;
var zoom;
var diagonal;
var rootData;
var nodes;
var links;
var isExtent = false;
var id = 0;
var opts = {
    url:"./test.json", //数据
    watermark_text:'人物', //水印
    backound_color:'#ffffff', //背景色
    colors:['#007bff','#28a745','#ffc107','#6c757d'] //节点颜色，按照数据category可以显示不同颜色
}
var timer = 0
$(window).resize(function(){
    clearTimeout(timer)
    timer = setTimeout(function(){
        window.location.reload();
    },200)
   
})
$(document).ready(function() {
    getData();
  
    $('#button_box a.download').off('click').on('click', function() {
        download('png')
    })
    $('#button_box a.refresh').off('click').on('click', function() {
        window.location.reload();
    })
    
    function download() {
        var svg = d3.select("svg");
        var serializer = new XMLSerializer();  
        var source = serializer.serializeToString(svg.node());  

        source = '<?xml version="1.0" standalone="no"?>\r\n' + source;  
        var url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);  

        var canvas = document.createElement("canvas");  
        canvas.width = 1000;  
        canvas.height = 800;  

        var context = canvas.getContext("2d");  
        var image = new Image;  
        image.src = url;
        context.fillStyle = opts.backound_color;
        context.fillRect(0,0, canvas.width,canvas.height);
        image.onload = function() {  
                context.drawImage(image, 0, 0);  
                var a = document.createElement("a");  
                a.download = "tree.jpg";  
                a.href = canvas.toDataURL("image/jpg");  
                a.click();  
        };  
        return false;
    }
});


function getData() {
    $.ajax({
        url: opts.url,
        type: 'GET',
        data: {
          
        },
        dataType: 'JSON',
        success: function(data) {
            if (data.Status === 200) {
                $('#load_data p').html('loading...');
                rootData = data.Result.Node;
                traverseTreeId(rootData);
                draw(rootData);
                $('#load_data').hide();
            } else {
                $('#load_data p').html('无数据');
            }
        }
    });
}


function draw(root) {
    tree = d3.layout.cluster()
        .size([360, 500])
        .separation(function(a, b) {
            return (a.parent == b.parent ? 1 : 2) / a.depth;
        });

    var svg = d3.select("svg");
    $("svg").empty();
  
    svg.attr("width", width);
	svg.attr("height", height);
    drawWaterMark(svg);

    container = svg.append("g");
    linkContainer = container.append("g");
    zoom = d3.behavior.zoom()
        .scaleExtent([0.2, 4])
        .on("zoom", zoomed);
    diagonal = d3.svg.diagonal.radial()
        .projection(function(d) {
            return [d.y, d.x / 180 * Math.PI];
        });


    svg.call(zoom).on('dblclick.zoom', null);

    initLocation();

   
    function zoomed() {
        container.attr("transform",
            "translate(" + zoom.translate() + ")" +
            "scale(" + zoom.scale() + ")"
        );
    }
    
    function interpolateZoom (translate, scale) {
        var self = this;
        return d3.transition().duration(350).tween("zoom", function () {
            var iTranslate = d3.interpolate(zoom.translate(), translate),
                iScale = d3.interpolate(zoom.scale(), scale);
            return function (t) {
                zoom
                    .scale(iScale(t))
                    .translate(iTranslate(t));
                zoomed();
            };
        });
    }
    
    function zoomClick() {
        var clicked = d3.event.target,
        direction=1,
            factor = 0.2,
            target_zoom = 1,
            center = [width / 2, height / 2],
            extent = zoom.scaleExtent(),
            translate = zoom.translate(),
            translate0 = [],
            l = [],
            view = {x: translate[0], y: translate[1], k: zoom.scale()};
    
        d3.event.preventDefault();
        
        direction = (this.id === 'zoom-in') ? 1 : -1;
        target_zoom = zoom.scale() * (1 + factor * direction);
    
        if (target_zoom < extent[0] || target_zoom > extent[1]) { return false; }
    
        translate0 = [(center[0] - view.x) / view.k, (center[1] - view.y) / view.k];
        view.k = target_zoom;
        l = [translate0[0] * view.k + view.x, translate0[1] * view.k + view.y];
    
        view.x += center[0] - l[0];
        view.y += center[1] - l[1];
    
        interpolateZoom([view.x, view.y], view.k);
    }
    d3.selectAll('#zoom-in').on('click',zoomClick);
    d3.selectAll('#zoom-out').on('click',zoomClick);
    
    function initLocation() {
        zoom.translate([width / 2, height / 2]);
        zoom.scale(0.5);
        container.attr("transform", "translate(" + (width / 2) + "," + (height / 2) + ")scale(" + zoom.scale() + ")");
    }

    nodes = tree.nodes(root);
    links = tree.links(nodes);

    nodes.forEach(function(d) {
        if (d.depth > 1) {
            if (d.children) {
                d._children = d.children;
                d.children = null;
            }
        }
    });

    root.x0 = 0;
    root.y0 = 0;
    drawTree(root);


    
}

function drawTree(data, hiddentype) {
    nodes = tree.nodes(rootData);
    links = tree.links(nodes);

    nodes.forEach(function(d) {
        if (d.depth > 2) {
            d.y = d.depth * (d.depth / 2) * 150;
        } else {
            d.y = d.depth * 150;
        }
    });
    var maxDepth = 1;
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].depth > maxDepth) {
            maxDepth = nodes[i].depth;
        }
    }

    var linkUpdate = linkContainer.selectAll(".link")
        .data(links, function(d) {
            if (hiddentype) {
                if (hiddentype.human) {
                    if (d.target.type == 'human' || d.source.type == 'human') {
                        return 1;
                    }
                }
                if (hiddentype.listed) {
                    if (d.source.depth > 0) {
                        if (d.target.type == 'listed' || d.source.type == 'listed') {
                            return 1;
                        }
                    }

                }
                if (hiddentype.nonlisted) {
                    if (d.source.depth > 0) {
                        if (d.target.type == 'nonlisted' || d.source.type == 'nonlisted') {
                            
                            return 1;
                        }
                    }

                }
            }

            return d.target.id;
        });
    var linkEnter = linkUpdate.enter();
    var linkExit = linkUpdate.exit();

    linkEnter.append("path")
        .attr("class", "link")
        .attr("style", "fill: none; stroke-opacity: 1;stroke-width: 1.5px;")
        .attr("d", function(d) {
            var o = {
                x: data.x0,
                y: data.y0
            };
            return diagonal({
                source: o,
                target: o
            });
        })
        .transition()
        .duration(500)
        .attr("d", diagonal);

    linkUpdate.attr("stroke", function(d) {
            var index = opts.colors[d.target.Category]
            console.log(index)
            if(index){
                return index
            }else{
                return opts.colors[0]
            }
        })
        .transition()
        .duration(500)
        .attr("d", diagonal);


    linkExit.transition()
        .duration(500)
        .attr("d", function(d) {
            var o = {
                x: data.x,
                y: data.y
            };
            return diagonal({
                source: o,
                target: o
            });
        })
        .remove();

    var nodeUpdate = container.selectAll(".node")
        .data(nodes, function(d) {
            if (hiddentype) {
                if (hiddentype.human) {
                    if (d.type == 'human') {
                        return 0;
                    }
                }
                if (hiddentype.listed) {
                    if (d.type == 'listed' && d.depth > 1) {
                        return 0;
                    }
                    if (d.depth > 2 && d.parent.type == 'listed') {
                        return 0;
                    }

                }
                if (hiddentype.nonlisted) {
                    if (d.type == 'nonlisted') {
                        if(d.name!='客户' && d.name!='供应商' && d.name!='股东' && d.name!='董监高'){
                            return 0;
                        }
                        
                    }
                    if (d.depth > 2 && d.parent.type == 'nonlisted') {
                        return 0;
                    }

                }
            }
            return d.id;

        });

    var nodeEnter = nodeUpdate.enter();
    var nodeExit = nodeUpdate.exit();
    var enterNodes = nodeEnter.append("g")
        .attr("class", function(d) {
            return "node";
        })
        .attr("transform", function(d) {
            return "translate(" + project(data.x0, data.y0) + ")";
        });
    enterNodes.append("circle")
        .attr("r", 0)
        .attr("fill", function(d) {
            var index = opts.colors[d.Category]
            console.log(index)
            if(index){
                return index
            }else{
                return opts.colors[0]
            }
        })
        .attr("stroke", function(d) {

            var index = opts.colors[d.Category]
            console.log(index)
            if(index){
                return index
            }else{
                return opts.colors[0]
            }
        })
        .attr("stroke-opacity", 0.5)
        .attr("stroke-width", function(d) {
            if (d.depth == 0) {
                return 10;
            }

            if (d.depth == 1) {
                return 6;
            }

            return 0;
        })
        .on("click", function(d) {
            if (d.depth > 0) {
                toggle(d);
                drawTree(d);
            } else {
                
            }
            console.log(d)
        });

    enterNodes.append("path")
        .attr("d", function(d) {
            if (d.depth > 0 && d._children) {
                return "M-6 -1 H-1 V-6 H1 V-1 H6 V1 H1 V6 H-1 V1 H-6 Z"
            } else if (d.depth > 0 && d.children) {
                return "M-6 -1 H6 V1 H-6 Z"
            }
        })
        .attr("fill", "#ffffff")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", "0.2")
        .on("click", function(d) {
            if (d.depth > 0) {
                toggle(d);
                drawTree(d);
            }
            console.log(d)
        });
    enterNodes.append("text")
        .attr("dy", function(d) {
            if (d.depth == 0) {
                return "-1.5em";
            }
            return "0.31em";
        })
        .attr("x", function(d) {
            if (d.depth == 0) {
                return d.name.length * 8
            }
            return d.x < 180 ? 15 : -15;
        })
        .text(function(d) {
            return d.name;
        })
        .style("text-anchor", function(d) {
            if (d.depth == 0) {
                return "end";
            }
            return d.x < 180 ? "start" : "end";
        })
        .style("fill-opacity", 0)
        .attr("transform", function(d) {
            if (d.depth > 0) {
                return "rotate(" + (d.x < 180 ? d.x - 90 : d.x + 90) + ")";
            } else {
                return "rotate(0)";
            }
        })
        .style("font-size", function(d) {
            if (d.depth == 0) {
                return "16px";
            }
            return "14px";
        })
        .attr("fill", function(d) {
            var index = opts.colors[d.Category]
            console.log(index)
            if(index){
                return index
            }else{
                return opts.colors[0]
            }
        })
        .on("dblclick", function(d) {
            console.log("duble click："+d.name)
        })
        .on('click', function(d) {
            //console.log(d);
        });

    var updateNodes = nodeUpdate.transition()
        .duration(500)
        .attr("transform", function(d) {
            return "translate(" + project(d.x, d.y) + ")";
        });
    updateNodes.select("text")
        .style("fill-opacity", 1)
        .attr("transform", function(d) {
            if (d.depth > 0) {
                return "rotate(" + (d.x < 180 ? d.x - 90 : d.x + 90) + ")";
            } else {
                return "rotate(0)";
            }
        })
        .attr("x", function(d) {
            if (d.depth == 0) {
                return d.name.length * 8
            }
            return d.x < 180 ? 15 : -15;
        })
        .attr("fill", function(d) {
            var index = opts.colors[d.Category]
            console.log(index)
            if(index){
                return index
            }else{
                return opts.colors[0]
            }
        })
        .style("text-anchor", function(d) {
            if (d.depth == 0) {
                return "end";
            }
            return d.x < 180 ? "start" : "end";
        });
    updateNodes.select("circle")
        .attr("r", function(d) {
            if (d.depth == 0) {
                return 12;
            }

            if (d.depth == 1) {
                return 10;
            }

            return 9;
        });
    updateNodes.select("path")
        .attr("d", function(d) {
            if (d.depth > 0 && d._children) {
                return "M-6 -1 H-1 V-6 H1 V-1 H6 V1 H1 V6 H-1 V1 H-6 Z"
            } else if (d.depth > 0 && d.children) {
                return "M-6 -1 H6 V1 H-6 Z"
            }
        });

    var exitNodes = nodeExit.transition()
        .duration(500)
        .attr("transform", function(d) {
            return "translate(" + project(data.x, data.y) + ")";
        })
        .remove();
    exitNodes.select("circle")
        .attr("r", 0);

    exitNodes.select("text")
        .style("fill-opacity", 0);

    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });

}



function toggle(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
}

function project(x, y) {
    var angle = (x - 90) / 180 * Math.PI,
        radius = y;
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

function drawWaterMark(svg) {
   
    var text_width = $(window).width() - 20;
    var row = Math.ceil(opts.watermark_text.length / (Math.floor(text_width / 12)));
    var declare = svg.append("g")
        .attr("transform", "translate(" + ($(window).width() - opts.watermark_text.length * 12) / 2 + "," + ($(window).height() - 100) + ")");
    for (var i = 0; i < row; i++) {
        declare.append("text")
            .text(function() {
                return opts.watermark_text.substr(i * Math.floor(text_width / 12), Math.floor(text_width / 12));
            })
            .attr("fill", "#bbbbbb")
            .attr("font-size", "18px")
            .attr("y", function() {
                return i * 15;
            });
    }
}


function traverseTree(node) {
    if (node._children) {
        node.children = node._children;
        node._children = null;
    }

    if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
            traverseTree(node.children[i]);
        }
    }
}

function traverseTreeId(node) {
    if (!node.id) {
        node.id = id;
        id++;
    }

    if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
            traverseTreeId(node.children[i]);
        }
    }
}

