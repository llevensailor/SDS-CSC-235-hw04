// SVG
const margin = 100;
const frameWidth = 1200;
const frameHeight = 600;
const vizWidth = (frameWidth - 3 * margin) / 2;
const vizHeight = (frameHeight - 2 * margin);

let frame = d3.select("#frame")
        .append("svg")
        .attr("width", frameWidth)
        .attr("height", frameHeight);

let frame1 = frame.append("g")
        .attr("transform", "translate(" + margin + "," + margin + ")");

let frame2 = frame.append("g")
        .attr("transform", "translate(" + (margin * 2 + vizWidth) + "," + margin + ")");


// hover to get point 
let hoverText = d3.select("body")
        .append("div")
        .attr("id", "hoverText");
        

let xPoint = "anxiety_score";
let yPoint = "sleep_hours"; 

function getAverages(data) {
    let grouped = d3.rollup(
        data, 
        v => ({anxiety: d3.mean(v, d => +d.anxiety_score),
            sleep: d3.mean(v, d => +d.sleep_hours)
        }),
        d => d.gender
    );
    return Array.from(grouped, ([gender, values]) => ({
        gender, 
        anxiety: values.anxiety,
        sleep: values.sleep
    }));
}

function update(data){
    data.forEach(d => {
        d[xPoint] = +d[xPoint];
        d[yPoint] = +d[yPoint];
    });
    let avgData = getAverages(data);

    // Creating the scatterplot 
let xScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[xPoint])]).nice()
        .range([0, vizWidth]);

let yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[yPoint])]).nice()
        .range([vizHeight, 0]);

let xAxis = d3.axisBottom(xScale);
let yAxis = d3.axisLeft(yScale);

frame1.append("g")
        .attr("transform", "translate(0," + vizHeight + ")")
        .call(xAxis);

frame1.append("text")
        .attr("transform", "translate(" + (vizWidth / 2) + "," + (vizHeight + margin / 2) + ")")
        .style("text-anchor", "middle")
        .text("Anxiety Score (0 - 10 Scale)");

frame1.append("g").call(yAxis);

frame1.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -vizHeight / 2)
        .attr("y", -margin / 2)
        .style("text-anchor", "middle")
        .text("Sleep Quality (0 - 10 Scale)");

frame1.append("text")
        .attr("id", "plotTitle")
        .attr("x", vizWidth /2)
        .attr("y", "-50" )
        .attr("text-anchor", "middle")
        .text("Anxiety vs. Sleep Score by Student");

frame2.append("text")
        .attr("id", "averageTitle")
        .attr("x", vizWidth /2)
        .attr("y", "-50" )
        .attr("text-anchor", "middle")
        .text("Average Anxiety and Sleep Score by Gender");

let genderScale = d3.scaleOrdinal()
        .domain([...new Set(data.map(d => d.gender))])
        .range(["blue", "pink", "green"]);

frame1.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d[xPoint]))
        .attr("cy", d => yScale(d[yPoint]))
        .attr("r", 3)
        .style("fill", d => genderScale(d.gender))
        .attr("class", (d, i) => "_" + i)

        //hover
        .on("mouseover", function(event, d){
            hoverText.style("opacity", 1)
            .html("<strong>Gender:</strong> " + d.gender + "<br>" +
                "<strong>Anxiety:</strong> " + d[xPoint] + "<br>" +
                "<strong>Sleep:</strong> " + d[yPoint]
            );
        })
        .on("mousemove", function(event){
            hoverText.style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function() {
        hoverText.style("opacity", 0);
        });
// added legend for the bars 
var genderKeys = [...new Set(data.map(d=> d.gender))];
var scatterLegend = frame1.append("g")
        .attr("transform", "translate(" + vizWidth +", 0)");

genderKeys.forEach((gender, i) => {
        scatterLegend.append("circle")
            .attr("cx", 6)
            .attr("cy", i * 20 + 6)
            .attr("r", 6)
            .attr("fill", genderScale(gender));
        scatterLegend.append("text")
            .attr("x", 18)
            .attr("y", i * 20 + 10)
            .style("font-size", "12px")
            .text(gender);
    });

//Regression Line Interactive
function linearRegression(pts) {
    var n = pts.length;
    var mx = d3.mean(pts, d => d[xPoint]);
    var my = d3.mean(pts, d => d[yPoint]);
    var m = d3.sum(pts, d => (d[xPoint] - mx) * (d[yPoint] - my)) /
            d3.sum(pts, d => (d[xPoint] - mx) ** 2);
    var b = my - m * mx;
    return {m, b}; 
}

var {m, b} = linearRegression(data);
var xMin = d3.min(data, d => d[xPoint]);
var xMax = d3.max(data, d => d[xPoint]);


let regressionLine = frame1.append("line")
        .attr("class", "regressionLine")
        .attr("x1", xScale(xMin))
        .attr("y1", yScale(m* xMin + b))
        .attr("x2", xScale(xMax))
        .attr("y2", yScale(m* xMax + b))
        .style("stroke", "red")
        .style("stroke-width", "2px")
        .style("opacity", 0)

        
let regressionOn = false; 
d3.select("#regressionButton").on("click", function() {
    regressionOn = !regressionOn;
    regressionLine.style("opacity", regressionOn ? 1 : 0);
    d3.select(this)
        .text(regressionOn ? "Hide Regression Line" : "Show Regression Line")
        .classed("active", regressionOn)
        .attr("aria-pressed", regressionOn);
});

let x0 = d3.scaleBand()
        .domain(avgData.map(d => d.gender))
        .range([0, vizWidth])
        .padding(0.2);

let x1 = d3.scaleBand()
        .domain(["anxiety", "sleep"])
        .range([0, x0.bandwidth()])
        .padding(0.05);

let y = d3.scaleLinear()
        .domain([0, d3.max(avgData, d => Math.max(d.anxiety, d.sleep))])
        .nice()
        .range([vizHeight, 0]);

let color = d3.scaleOrdinal()
        .domain(["anxiety", "sleep"])
        .range(["red", "purple"]);

frame2.append("g")
        .attr("transform", "translate(0," + vizHeight + ")")
        .call(d3.axisBottom(x0));

frame2.append("g")
        .call(d3.axisLeft(y));

frame2.append("text")
        .attr("x", vizWidth / 2)
        .attr("y", vizHeight + margin / 2)
        .attr("text-anchor", "middle")
        .text("Gender");

frame2.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -vizHeight / 2)
        .attr("y", -margin / 2)
        .attr("text-anchor", "middle")
        .text("Average Score");

// bars
frame2.append("g")
    .selectAll("g")
    .data(avgData)
    .enter()
    .append("g")
    .attr("transform", d => "translate(" + x0(d.gender) + ",0)")
    .selectAll("rect")
    .data(d => [
        {key: "anxiety", value: d.anxiety, gender: d.gender},
        {key: "sleep", value: d.sleep, gender: d.gender}
    ])
    .enter()
    .append("rect")
    .attr("x", d => x1(d.key))
    .attr("y", d => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", d => vizHeight - y(d.value))
    .attr("fill", d => color(d.key))

    
    .on("mouseover", function(event, d) {
        hoverText.style("opacity", 1)
            .html(
                "<strong>Gender:</strong> " + d.gender + "<br>" +
                "<strong>" + d.key + " avg:</strong> " + d.value.toFixed(2)
            );
    })
    .on("mousemove", function(event) {
        hoverText.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", function() {
        hoverText.style("opacity", 0);
    });
    // added legend for the bars 
    var barKeys = ["anxiety", "sleep"];
    var barLegend = frame2.append("g")
            .attr("transform", "translate(" + vizWidth +", 0)");

    barKeys.forEach((key, i) => {
        barLegend.append("rect")
            .attr("x", 0)
            .attr("y", i * 20)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", color(key));
        barLegend.append("text")
            .attr("x", 18)
            .attr("y", i * 20 + 10)
            .style("font-size", "12px")
            .text(key.charAt(0).toUpperCase() + key.slice(1) + " Avg");
});



}


// load data
d3.csv("mental_health.csv").then(function(data) {
update(data);
});











