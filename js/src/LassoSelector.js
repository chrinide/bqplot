/* Copyright 2015 Bloomberg Finance L.P.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var d3 = require("d3");
var _ = require("underscore");
var utils = require("./utils");
var baseselector = require("./Selector");
var lasso = require("./lasso_test");

var LassoSelector = baseselector.BaseXYSelector.extend({
    render: function() {
        LassoSelector.__super__.render.apply(this);
        var scale_creation_promise = this.create_scales();
        this.line = d3.svg.line();
        this.lasso_vertices = [];
        this.lasso_counter = 0;

        var that = this;
        Promise.all([this.mark_views_promise, scale_creation_promise]).then(function() {
            var drag = d3.behavior.drag()
                .on("dragstart", _.bind(that.drag_start, that))
                .on("drag", _.bind(that.drag_move, that))
                .on("dragend", _.bind(that.drag_end, that));

            d3.select(window).on("keydown", _.bind(that.keydown, that));

            that.d3el.attr("class", "lassoselector");

            //container for mouse events
            that.background = that.d3el.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", that.width)
                .attr("height", that.height)
                .attr("visibility", "hidden")
                .attr("pointer-events", "all")
                .style("cursor", "crosshair")
                .call(drag);

            that.create_listeners();
        });
    },

    create_listeners: function() {
        LassoSelector.__super__.create_listeners.apply(this);
        this.listenTo(this.model, "change:color", this.change_color, this);
    },

    change_color: function(model, color) {
        if (color) {
            this.d3el.selectAll("path").style("stroke", color);
        }
    },

    drag_start: function() {
        this.lasso_vertices = [];
        var lasso = this.d3el.append("path")
            .attr("id", "l" + (++this.lasso_counter))
            .on("click", function() {
                //toggle the opacity of lassos
                var lasso = d3.select(this);
                lasso.classed("selected", !lasso.classed("selected"));
            });
        var color = this.model.get("color");
        if (color) {
            lasso.style("stroke", color);
        }
    },

    drag_move: function() {
        this.lasso_vertices.push(d3.mouse(this.background.node()));
        this.d3el.select("#l" + this.lasso_counter)
            .attr("d", this.line(this.lasso_vertices));
    },

    drag_end: function() {
        //close the lasso
        this.d3el.select("#l" + this.lasso_counter)
            .attr("d", this.line(this.lasso_vertices) + "Z");

        var mark_data_in_lasso = false;
        var that = this;
        // update selected for each mark
        _.each(this.mark_views, function(mark_view) {
            var data_in_lasso = mark_view.update_selected_in_lasso("l" + that.lasso_counter,
                                                                   that.lasso_vertices,
                                                                   lasso.point_in_lasso);
            if (data_in_lasso) {
                mark_data_in_lasso = true;
            }
        });

        //remove the lasso if it doesnt have any mark data
        if (!mark_data_in_lasso) {
            this.d3el.select("#l" + this.lasso_counter).remove();
            this.lasso_counter--;
        }
    },

    relayout: function() {
        LassoSelector.__super__.relayout.apply(this);
        this.background.attr("width", this.width).attr("height", this.height);
    },

    keydown: function() {
       //delete key pressed
       if (d3.event.keyCode === 46) {
           //delete selected lassos
           var lassos_to_delete = this.d3el.selectAll(".selected");

           var that = this;
           lassos_to_delete.each(function() {
               var lasso_name = d3.select(this).attr("id");
               // delete selected for each mark
               _.each(that.mark_views, function(mark_view) {
                   mark_view.update_selected_in_lasso(lasso_name, null, null);
               });
           });
           lassos_to_delete.remove();
      }
    }
});


module.exports = {
    LassoSelector: LassoSelector
};
