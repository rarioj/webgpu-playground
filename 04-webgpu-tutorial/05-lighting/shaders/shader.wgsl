@group(0) @binding(0) var<storage> modelViews: array<mat4x4<f32>>;
@group(0) @binding(1) var<uniform> projection: mat4x4<f32>;
@group(0) @binding(2) var<storage> colors: array<vec4<f32>>;
@group(1) @binding(0) var<uniform> ambientLightIntensity: f32;
@group(1) @binding(1) var<uniform> pointLight: array<vec4<f32>, 2>;
@group(1) @binding(2) var<uniform> directionalLight: array<vec4<f32>, 2>;

struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) fragmentPosition: vec3<f32>,
    @location(1) fragmentUV: vec2<f32>,
    @location(2) fragmentNormal: vec3<f32>,
    @location(3) fragmentColor: vec4<f32>,
}

@vertex
fn vertexMain(
    @builtin(instance_index) index: u32,
    @location(0) position: vec3<f32>,
    @location(1) uv: vec2<f32>,
    @location(2) normal: vec3<f32>,
) -> VertexOutput {
    let modelView: mat4x4<f32> = modelViews[index];
    let mvp: mat4x4<f32> = projection * modelView;
    let pos: vec4<f32> = vec4<f32>(position, 1.0);

    var output: VertexOutput;
    output.Position = mvp * pos;
    output.fragmentPosition = (modelView * pos).xyz;
    output.fragmentUV = uv;
    output.fragmentNormal = (modelView * vec4<f32>(normal, 0.0)).xyz;
    output.fragmentColor = colors[index];
    return output;
}

@fragment
fn fragmentMain(
    @location(0) fragmentPosition: vec3<f32>,
    @location(1) fragmentUV: vec2<f32>,
    @location(2) fragmentNormal: vec3<f32>,
    @location(3) fragmentColor: vec4<f32>,
) -> @location(0) vec4<f32> {
    let pixelColor: vec3<f32> = fragmentColor.rgb;
    let ambientLightColor: vec3<f32> = vec3(1.0, 1.0, 1.0);
    let directionalLightColor: vec3<f32> = vec3(1.0, 1.0, 1.0);
    let pointLightColor: vec3<f32> = vec3(1.0, 1.0, 1.0);
    var outputLight: vec3<f32> = vec3(0.0, 0.0, 0.0);

    // Ambient light
    outputLight += ambientLightColor * ambientLightIntensity;

    // Directional light
    var directionalLightPosition: vec3<f32> = directionalLight[0].xyz;
    var directionalLightIntensity: f32 = directionalLight[1][0];
    var diffuse: f32 = max(dot(normalize(directionalLightPosition), fragmentNormal), 0.0);
    outputLight += directionalLightColor * directionalLightIntensity * diffuse;

    // Point light
    var pointLightPosition: vec3<f32> = pointLight[0].xyz;
    var pointLightIntensity: f32 = pointLight[1][0];
    var pointLightRadius: f32 = pointLight[1][1];
    var pointLightDiff: vec3<f32> = pointLightPosition - fragmentPosition;
    var distance: f32 = length(pointLightDiff);
    if distance < pointLightRadius {
        var diffuse: f32 = max(dot(normalize(pointLightDiff), fragmentNormal), 0.0);
        var distanceFactor: f32 = pow(1.0 - distance / pointLightRadius, 2.0);
        outputLight += pointLightColor * pointLightIntensity * diffuse * distanceFactor;
    }

    return vec4<f32>(pixelColor * outputLight, 1.0);
}