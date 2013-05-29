//Utility function to convert degrees to radians
function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

var app;
var currentlyPressedKeys = {};

//Constructor for the App object
function Application(canvasID) {
    this.canvas = document.getElementById(canvasID);

    //Set up GL object and corresponding viewport parameters
    try {
        this.GL = this.canvas.getContext("experimental-webgl");
        this.viewport = {
            width: this.canvas.width,
            height: this.canvas.height,
            aspect: this.canvas.width / this.canvas.height
        };
    } catch (e) {
        //Should probably do better error handling here...
    }

    if (!this.GL) {
        alert("WebGL is not supported by this browser");
    }

    //Set Model-View and Perspective Matrix Variables
    this.mvMat = mat4.create();
    this.mvMatStack = [];
    this.perspectiveMat = mat4.create();

    //Initialize timer for animation function
    this.lastTime = 0;

    this.mainScene = false;

    this.z = -5.0;
}

//Method to extract a shader from the DOM given an HTML element ID
Application.prototype.extractShader = function(shaderID) {
    var shaderElement = document.getElementById(shaderID);

    if (!shaderElement) {
        return null;
    }

    var shaderSrc = "";
    var k = shaderElement.firstChild;
    while (k) {
    if (k.nodeType == 3) {
        shaderSrc += k.textContent;
    }
        k = k.nextSibling;
    }

    var shader;
    if (shaderElement.type == "x-shader/x-fragment") {
        shader = this.GL.createShader(this.GL.FRAGMENT_SHADER);
    } else if (shaderElement.type == "x-shader/x-vertex") {
        shader = this.GL.createShader(this.GL.VERTEX_SHADER);
    } else {
        return null;
    }

    this.GL.shaderSource(shader, shaderSrc);
    this.GL.compileShader(shader);

    if (!this.GL.getShaderParameter(shader, this.GL.COMPILE_STATUS)) {
        alert(this.GL.getShaderInfoLog(shader));
        return null;
    }

    return shader;
};

//Method to load the fragment and vertex shader and construct/link a GL
//program with them
Application.prototype.loadShaders = function() {
    //Extract shaders into variables
    var fragmentShader = this.extractShader("fragment-shader");
    var vertexShader = this.extractShader("vertex-shader");

    //Create program with fragment and vertex shaders
    this.program = this.GL.createProgram();
    this.GL.attachShader(this.program, vertexShader);
    this.GL.attachShader(this.program, fragmentShader);
    this.GL.linkProgram(this.program);

    //Check to ensure program linked correctly
    if (!this.GL.getProgramParameter(this.program, this.GL.LINK_STATUS)) {
        alert("Failed to initialize shaders");
    }

    //Tell GL to use the newly linked program
    this.GL.useProgram(this.program);

    //Acquire position of vertex attribute
    this.program.vertexPositionAttribute = this.GL.getAttribLocation(this.program, "aVertexPosition");
    this.GL.enableVertexAttribArray(this.program.vertexPositionAttribute);

    //Acquire position of vertex normal attribute
    this.program.vertexNormalAttribute = this.GL.getAttribLocation(this.program, "aVertexNormal");
    this.GL.enableVertexAttribArray(this.program.vertexNormalAttribute);

    //Acquire position of texture coordinates attribute
    this.program.textureCoordAttribute = this.GL.getAttribLocation(this.program, "aTextureCoord");
    this.GL.enableVertexAttribArray(this.program.textureCoordAttribute);

    //Acquire position of various uniforms used in shaders
    this.program.pMatrixUniform = this.GL.getUniformLocation(this.program, "uPMatrix");
    this.program.mvMatrixUniform = this.GL.getUniformLocation(this.program, "uMVMatrix");
    this.program.nMatrixUniform = this.GL.getUniformLocation(this.program, "uNMatrix");
    this.program.samplerUniform = this.GL.getUniformLocation(this.program, "uSampler");
    this.program.ambientColorUniform = this.GL.getUniformLocation(this.program, "uAmbientColor");
    this.program.lightingDirectionUniform = this.GL.getUniformLocation(this.program, "uLightingDirection");
    this.program.directionalColorUniform = this.GL.getUniformLocation(this.program, "uDirectionalColor");
    this.program.alphaUniform = this.GL.getUniformLocation(this.program, "uAlpha");
};

//Bind a texture and set GL attributes once the image is loaded
Application.prototype.bindTexture = function(texture) {
    this.GL.pixelStorei(this.GL.UNPACK_FLIP_Y_WEBGL, true);

    this.GL.bindTexture(this.GL.TEXTURE_2D, texture);
    this.GL.texImage2D(this.GL.TEXTURE_2D, 0, this.GL.RGBA, this.GL.RGBA, this.GL.UNSIGNED_BYTE, texture.image);
    this.GL.texParameteri(this.GL.TEXTURE_2D, this.GL.TEXTURE_MAG_FILTER, this.GL.LINEAR);
    this.GL.texParameteri(this.GL.TEXTURE_2D, this.GL.TEXTURE_MIN_FILTER, this.GL.LINEAR_MIPMAP_NEAREST);
    this.GL.generateMipmap(this.GL.TEXTURE_2D);

    this.GL.bindTexture(this.GL.TEXTURE_2D, null);
};

//Initialize all textures for the application
Application.prototype.initTextures = function() {
    var applicationObject = this;
    this.texture = app.GL.createTexture();
    this.texture.image = new Image();
    this.texture.image.onload = function () {
        applicationObject.bindTexture(applicationObject.texture);
    };

    this.texture.image.src = "/img/crate.gif";
};

Application.prototype.pushModelViewMat = function() {
    var copy = mat4.create();
    mat4.set(this.mvMat, copy);
    this.mvMatStack.push(copy);
};

Application.prototype.popModelViewMat = function() {
    if (this.mvMatStack.length === 0) {
        throw "Invalid popMatrix!";
    }
    this.mvMat = this.mvMatStack.pop();
};

//Transfer all relevant matrix uniforms to the GPU for drawing
Application.prototype.transferMatrixUniforms = function() {
    this.GL.uniformMatrix4fv(this.program.pMatrixUniform, false, this.perspectiveMat);
    this.GL.uniformMatrix4fv(this.program.mvMatrixUniform, false, this.mvMat);

    var normalMatrix = mat3.create();
    mat4.toInverseMat3(this.mvMat, normalMatrix);
    mat3.transpose(normalMatrix);
    this.GL.uniformMatrix3fv(this.program.nMatrixUniform, false, normalMatrix);
};


Application.prototype.animate = function() {
    var timeNow = new Date().getTime();
    if (this.lastTime !== 0) {
        var elapsed = timeNow - this.lastTime;
    }
    this.lastTime = timeNow;
};

Application.prototype.tick = function() {
    var self = this;
    requestAnimFrame(function() {
        self.tick();
    });
    this.handleKeys();
    this.mainScene.draw();
    this.animate();
};

Application.prototype.handleKeyDown = function(event) {
    currentlyPressedKeys[event.keyCode] = true;
};

Application.prototype.handleKeyUp = function(event) {
    currentlyPressedKeys[event.keyCode] = false;
};

Application.prototype.handleKeys = function() {
    if (currentlyPressedKeys[37]) {
        this.mainScene.playerX += 0.2;
    }
    if (currentlyPressedKeys[39]) {
        this.mainScene.playerX -= 0.2;
    }
    if (currentlyPressedKeys[38]) {
        // Up cursor key
    }
    if (currentlyPressedKeys[40]) {
        // Down cursor key
    }
};

//Constructor for the Scene object
function Scene(application) {
    this.app = application;
    this.ambientLight = {
        R: 0.2,
        G: 0.2,
        B: 0.2
    };
    this.directionalLightVector = {
        X: -0.25,
        Y: -0.25,
        Z: -1
    };
    this.directionalLight = {
        R: 0.8,
        G: 0.8,
        B: 0.8
    };
    this.objects = [];
    this.playerX = 0;
}

//Initializes a scene with the required buffers for a cube
Scene.prototype.initialize = function() {
    this.cubePositionsBuffer = this.app.GL.createBuffer();
    this.app.GL.bindBuffer(this.app.GL.ARRAY_BUFFER, this.cubePositionsBuffer);
    var vertices = [
        // Front face
        -1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,
         1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,

        // Back face
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0, -1.0, -1.0,

        // Top face
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,
         1.0,  1.0, -1.0,

        // Bottom face
        -1.0, -1.0, -1.0,
         1.0, -1.0, -1.0,
         1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,

        // Right face
         1.0, -1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0,  1.0,  1.0,
         1.0, -1.0,  1.0,

        // Left face
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0
    ];
    this.app.GL.bufferData(this.app.GL.ARRAY_BUFFER, new Float32Array(vertices), this.app.GL.STATIC_DRAW);
    this.cubePositionsBuffer.itemSize = 3;
    this.cubePositionsBuffer.numItems = 24;

    this.cubeNormalsBuffer = this.app.GL.createBuffer();
    this.app.GL.bindBuffer(this.app.GL.ARRAY_BUFFER, this.cubeNormalsBuffer);
    var vertexNormals = [
        // Front face
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,
         0.0,  0.0,  1.0,

        // Back face
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,
         0.0,  0.0, -1.0,

        // Top face
         0.0,  1.0,  0.0,
         0.0,  1.0,  0.0,
         0.0,  1.0,  0.0,
         0.0,  1.0,  0.0,

        // Bottom face
         0.0, -1.0,  0.0,
         0.0, -1.0,  0.0,
         0.0, -1.0,  0.0,
         0.0, -1.0,  0.0,

        // Right face
         1.0,  0.0,  0.0,
         1.0,  0.0,  0.0,
         1.0,  0.0,  0.0,
         1.0,  0.0,  0.0,

        // Left face
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0
    ];
    this.app.GL.bufferData(this.app.GL.ARRAY_BUFFER, new Float32Array(vertexNormals), this.app.GL.STATIC_DRAW);
    this.cubeNormalsBuffer.itemSize = 3;
    this.cubeNormalsBuffer.numItems = 24;

    this.cubeTextureCoordsBuffer = this.app.GL.createBuffer();
    this.app.GL.bindBuffer(this.app.GL.ARRAY_BUFFER, this.cubeTextureCoordsBuffer);
    var textureCoords = [
        // Front face
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0,

        // Back face
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0,
        0.0, 0.0,

        // Top face
        0.0, 1.0,
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,

        // Bottom face
        1.0, 1.0,
        0.0, 1.0,
        0.0, 0.0,
        1.0, 0.0,

        // Right face
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0,
        0.0, 0.0,

        // Left face
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0
    ];
    this.app.GL.bufferData(this.app.GL.ARRAY_BUFFER, new Float32Array(textureCoords), this.app.GL.STATIC_DRAW);
    this.cubeTextureCoordsBuffer.itemSize = 2;
    this.cubeTextureCoordsBuffer.numItems = 24;

    this.cubeIndexBuffer = this.app.GL.createBuffer();
    this.app.GL.bindBuffer(this.app.GL.ELEMENT_ARRAY_BUFFER, this.cubeIndexBuffer);
    var cubeVertexIndices = [
        0, 1, 2,      0, 2, 3,    // Front face
        4, 5, 6,      4, 6, 7,    // Back face
        8, 9, 10,     8, 10, 11,  // Top face
        12, 13, 14,   12, 14, 15, // Bottom face
        16, 17, 18,   16, 18, 19, // Right face
        20, 21, 22,   20, 22, 23  // Left face
    ];
    this.app.GL.bufferData(this.app.GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), this.app.GL.STATIC_DRAW);
    this.cubeIndexBuffer.itemSize = 1;
    this.cubeIndexBuffer.numItems = 36;

    //Initialize objects in the scene
    this.initObjects();
};

Scene.prototype.initObjects = function() {
    for (var i = 0; i < 15; i++)
        this.objects.push(new Cube(this, this.getValidObjectX(), 15 - Math.floor(Math.random() * 30)));
};

Scene.prototype.getValidObjectX = function() {
    var valid = false;
    var x;
    while (valid === false)
    {
        x = Math.floor(Math.random() * 50) - 25 - this.playerX;
        valid = true;
        for (var obj in this.objects)
        {
            if (Math.abs(this.objects[obj].x - x) <= 2 && this.objects[obj].z < -30)
            {
                valid = false;
                break;
            }
        }
    }
    return x;
};
Scene.prototype.draw = function() {
    this.app.GL.viewport(0, 0, this.app.viewport.width, this.app.viewport.height);
    this.app.GL.clear(this.app.GL.COLOR_BUFFER_BIT | this.app.GL.DEPTH_BUFFER_BIT);

    mat4.perspective(45, this.app.viewport.aspect, 0.1, 100.0, this.app.perspectiveMat);

    mat4.identity(this.app.mvMat);

    //Add yaw to make camera look down
    mat4.rotate(this.app.mvMat, degreesToRadians(15), [1, 0, 0]);
    mat4.translate(this.app.mvMat, [this.playerX, -3, -5.0]);
    for (var obj in this.objects)
    {
        this.objects[obj].animate();
        this.objects[obj].draw();
    }
};

Scene.prototype.drawCube = function() {
    this.app.GL.bindBuffer(this.app.GL.ARRAY_BUFFER, this.cubePositionsBuffer);
    this.app.GL.vertexAttribPointer(this.app.program.vertexPositionAttribute, this.cubePositionsBuffer.itemSize, this.app.GL.FLOAT, false, 0, 0);

    this.app.GL.bindBuffer(this.app.GL.ARRAY_BUFFER, this.cubeNormalsBuffer);
    this.app.GL.vertexAttribPointer(this.app.program.vertexNormalAttribute, this.cubeNormalsBuffer.itemSize, this.app.GL.FLOAT, false, 0, 0);

    this.app.GL.bindBuffer(this.app.GL.ARRAY_BUFFER, this.cubeTextureCoordsBuffer);
    this.app.GL.vertexAttribPointer(this.app.program.textureCoordAttribute, this.cubeTextureCoordsBuffer.itemSize, this.app.GL.FLOAT, false, 0, 0);

    this.app.GL.activeTexture(this.app.GL.TEXTURE0);
    this.app.GL.bindTexture(this.app.GL.TEXTURE_2D, this.app.texture);
    this.app.GL.uniform1i(this.app.program.samplerUniform, 0);

    this.app.GL.enable(this.app.GL.DEPTH_TEST);

    var alpha = 1.0;
    this.app.GL.uniform1f(this.app.program.alphaUniform, alpha);

    this.app.GL.uniform3f(
        this.app.program.ambientColorUniform,
        this.ambientLight.R,
        this.ambientLight.G,
        this.ambientLight.B
    );

    var lightingDirection = [this.directionalLightVector.X, this.directionalLightVector.Y, this.directionalLightVector.Z];
    var adjustedLD = vec3.create();
    vec3.normalize(lightingDirection, adjustedLD);
    vec3.scale(adjustedLD, -1);
    this.app.GL.uniform3fv(this.app.program.lightingDirectionUniform, adjustedLD);

    this.app.GL.uniform3f(
        this.app.program.directionalColorUniform,
        this.directionalLight.R,
        this.directionalLight.G,
        this.directionalLight.B
    );

    this.app.GL.bindBuffer(this.app.GL.ELEMENT_ARRAY_BUFFER, this.cubeIndexBuffer);
    this.app.transferMatrixUniforms();
    this.app.GL.drawElements(this.app.GL.TRIANGLES, this.cubeIndexBuffer.numItems, this.app.GL.UNSIGNED_SHORT, 0);
};

function Cube(scene, startX, startZ) {
    this.x = startX;
    this.z = startZ;
    this.scene = scene;
}

Cube.prototype.draw = function() {
    //Push a new model-view matrix onto the stack
    this.scene.app.pushModelViewMat();

    //Make any cube-specific transformations (in this case just move to x/z position)
    mat4.translate(this.scene.app.mvMat, [this.x, 0.0, this.z]);

    // Draw the Cube
    this.scene.drawCube();

    this.scene.app.popModelViewMat();
};

Cube.prototype.animate = function() {
    //Any animations for individual cubes
    this.z += 0.5;
    if (this.z >= 5)
    {
        this.z = -35;
        this.x = this.scene.getValidObjectX();
    }

};

function webGLStart(canvasId) {
    app = new Application(canvasId);
    app.loadShaders();
    cubeRunnerScene = new Scene(app);
    cubeRunnerScene.initialize();
    app.mainScene = cubeRunnerScene;
    app.initTextures();

    app.GL.clearColor(0.0, 0.0, 0.0, 1.0);

    document.onkeydown = app.handleKeyDown;
    document.onkeyup = app.handleKeyUp;

    app.tick();
}
