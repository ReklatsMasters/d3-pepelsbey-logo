const width = 512;
const height = width;

const radius = width / 2;
const inner_radius = radius - 110; // 146

const space_angle = 8;    // angle between arcs
const offset_angle = 45;  // offset from 0 degrees

const radian = Math.PI / 180;

const small = 90; // small arc
const big = 254;  // big arc

/** magic angle for inner corners of big arc  */
const magic_angle_offset = 2;

var data = [
  
  // small
  {
    color: "#C00",
    startAngle: offset_angle,
    endAngle: offset_angle + small
  }
  
  // big
  ,{
    color: "#402724",
    fix: true,
    startAngle: offset_angle + small + space_angle,
    endAngle: offset_angle + small + space_angle + big
  }
];

var arc = d3.svg.arc()
  .outerRadius(radius)
  .innerRadius(inner_radius)
;

var g = d3.select('#chart-wrap')
  .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewbox', `0 0 ${ width } ${ height }`)
  .append('g')
    .attr('transform', `translate(${ radius }, ${ radius })`)
;

var arcs = g.selectAll('path.piece')
  .data(data)
  .enter()
    .append('path')
    .attr('class', 'piece')
    .attr('fill', d => d.color)
    .each(function(d) {
      var path = d3.select(this);
      
      // draw animated small arc
      if (!d.fix) {
        return path.transition()
          .delay(200)
          .duration(450)
          .ease("linear")
          .attrTween('d', animate_small_arc);
      }

      // draw animated big arc
      path.transition()
        .delay(650)
        .duration(700)
        .ease("linear")
        .attrTween('d', animate_big_arc)
        .transition()
          .duration(250)
          .attrTween('d', animate_big_arc2)
      ;
    })
;

/************** PATCH *****************/

/**
 * Extract X & Y vars for inner corners
 * from start of path
 * 
 * @param p {String} - generated string from `path` element
 * @return {String} - fixed path
 */
function path_extract_start(p) {
  var after = 'Z';
  var between = ',';  

  var _bw_y = p.lastIndexOf(between); // separator pos
  var _bw_x = p.lastIndexOf(' ');
  
  var y = parseFloat(p.slice(_bw_y + 1));
  var x = parseFloat(p.slice(_bw_x + 1));
  
  var before = p.slice(0, _bw_x);
  return {
    before,
    after,
    between,
    x,
    y
  };
}

/**
 * Extract X & Y vars for inner corners
 * from end of path
 * 
 * @param p {String} - generated string from `path` element
 * @return {String} - fixed path
 */
function path_extract_end(p) {
  var between = ',';
  
  var _bf = p.lastIndexOf('L');
  var before = p.slice(0, _bf + 1);
  
  var _bw = p.indexOf(between, _bf); // separator pos
  
  var x = parseFloat( p.slice(_bf + 1) );
  var y = parseFloat( p.slice(_bw + 1) );
  
  var after = p.slice((y + "").length + _bw + 1);
  
  return {
    before,
    after,
    between,
    x,
    y
  };
}

/** 
 * Calculate new coordinates
 * 
 * @param radius {Number} - inner radius
 * @param angle {Number}  - angle, startAngle or endAngle
 * @param fix_angle {Number} - offset,fix angle
 */
function path_calc(radius, angle, fix_angle) {
  var a = (angle + toRadian(fix_angle)) - Math.PI / 2;
  
  return {
    y: radius * Math.sin(a),
    x: radius * Math.cos(a)
  }
}

/** 
 * convert to radians
 * @param a {Number} - angle in degrees
 * @return {Number}  - angle in radians
 */
function toRadian(a) {
  return a * Math.PI / 180;
}

/** 
 * convert from radians
 * @param a {Number} - angle in radians
 * @return {Number}  - angle in degrees 
 */
function fromRadian(a) {
  return a * 180 / Math.PI;
}

/** build extracted and fixed path */
function path_build(p) {
  return [p.before, p.x, p.between, p.y, p.after].join("");
}

/**
 * Patch two inner corners
 * we should reduce inner corners 
 * of `space_angle` degrees
 * 
 * @param path {String}     - generated string from `path` element
 * @param radius {Number}   - inner radius
 * @param angle {Number}    - angle, startAngle or endAngle
 * @param fix {Number}      - offset,fix angle
 * @param parser {Function} - function-extractor of X and Y
 * @return {String}         - fixed path
 */
function patch_corners(path, radius, angle, fix, parser) {
  var parsed = parser(path);
  var fixed = path_calc(radius, angle, fix);
  
  parsed.x = fixed.x;
  parsed.y = fixed.y;
  
  return path_build(parsed);
}

/**
 * Main function of patch corners
 */
function patch(path, radius, data, fix) {
  var end_path = patch_corners(path, radius, data.endAngle, -fix, path_extract_end);
  return patch_corners(end_path, radius, data.startAngle, fix, path_extract_start);
}

/******* ANIMATION *******/

/**
 * Animate small arc
 * @param d {Object} - element data
 */
function animate_small_arc(d) {
  var i = d3.interpolate(90, d.startAngle);
  var j = d3.interpolate(90, d.endAngle);
  
  return function(t) {
    d.startAngle = toRadian(i(t));
    d.endAngle = toRadian(j(t));
    
    return arc(d);
  }
}

/**
 * Animate big arc
 * Step 1: animate without fixed inner corners
 */
function animate_big_arc() {
  var i = d3.interpolate(270, 360);
  var j = d3.interpolate(270, 180);
  
  return function(t) {
    var d = {};
    
    d.startAngle = toRadian(i(t));
    d.endAngle = toRadian(j(t));
        
    return arc(d);
  }
}

/**
 * Animate big arc
 * Step 2: animate with fixed inner corners
 */
function animate_big_arc2(d) {  
  var i = d3.interpolate(180, d.startAngle);
  var j = d3.interpolate(360, d.endAngle);
  var k = d3.interpolate(0, space_angle-magic_angle_offset);
  
  return function(t) {
    d.startAngle = toRadian(i(t));
    d.endAngle = toRadian(j(t));
    
    return patch(arc(d), inner_radius, d, k(t));
  }
}