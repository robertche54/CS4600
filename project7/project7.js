// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	// I am using the transformation matrix I made from project 4
	
	// Shortening variable names
	var y = rotationY;
	var z = rotationX;

	var mv = [
		Math.cos(y), 0, -Math.sin(y), 0,
		Math.sin(y) * Math.sin(z), Math.cos(z), Math.cos(y) * Math.sin(z), 0,
		Math.sin(y) * Math.cos(z), -Math.sin(z), Math.cos(y) * Math.cos(z), 0,
		translationX, translationY, translationZ, 1
	];
	
	return mv;
}

// I will be reusing the MeshDrawer I implemented in project 5
class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		// Compile the shader program
		this.prog = InitShaderProgram( meshVS, meshFS );
		
		// Get the ids of the uniform variables in the shaders
		this.mvp = gl.getUniformLocation( this.prog, 'mvp' );
		this.nm = gl.getUniformLocation( this.prog, 'normalMat' );

		// Get the the vertex attributes in the shaders
		this.verts = gl.getAttribLocation( this.prog, 'pos' );

		// Get the text coord attributes in the shaders
		this.txc = gl.getAttribLocation( this.prog, 'txc' );

		// Get the norm attributes in the shaders
		this.norm = gl.getAttribLocation( this.prog, 'norm' );

		// Create the vertex buffer object
		this.vertBuffer = gl.createBuffer();

		// Create the text coords buffer object
		this.txcBuffer = gl.createBuffer();

		// Create the normal buffers object
		this.normBuffer = gl.createBuffer();

		this.showTexture(true);
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords, normals )
	{
		this.numTriangles = vertPos.length / 3;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.txcBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals),  gl.STATIC_DRAW);
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		var loc = gl.getUniformLocation( this.prog, 'swap' );
		gl.useProgram( this.prog );
		gl.uniform1f( loc, swap );
	}
	
	// This method is called to draw the triangular mesh.
	// The arguments are the model-view-projection transformation matrixMVP,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw( matrixMVP, matrixMV, matrixNormal )
	{
		gl.useProgram( this.prog );

		// Set the transformations
		gl.uniformMatrix4fv( this.mvp, false, matrixMVP );
		gl.uniformMatrix3fv( this.nm, false, matrixNormal );

		// Draw the triangles
		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertBuffer );
		gl.vertexAttribPointer( this.verts, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.verts );

		gl.bindBuffer( gl.ARRAY_BUFFER, this.normBuffer );
		gl.vertexAttribPointer( this.norm, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.norm );

		gl.bindBuffer( gl.ARRAY_BUFFER, this.txcBuffer );
		gl.vertexAttribPointer( this.txc, 2, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.txc );

		gl.drawArrays( gl.TRIANGLES, 0, this.numTriangles );
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{
		// Bind the texture
		var tex = gl.createTexture();
		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, tex );

		// You can set the texture image data using the following command.
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );
		gl.generateMipmap( gl.TEXTURE_2D );
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

		// Now that we have a texture, it might be a good idea to set
		// some uniform parameter(s) of the fragment shader, so that it uses the texture.
		var sampler = gl.getUniformLocation( this.prog, 'tex' );
		gl.useProgram( this.prog );
		gl.uniform1i( sampler, 0 );
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
		var loc = gl.getUniformLocation( this.prog, 'show' );
		gl.useProgram( this.prog );
		gl.uniform1f( loc, show );
	}
	
	// This method is called to set the incoming light direction
	setLightDir( x, y, z )
	{
		var loc = gl.getUniformLocation( this.prog, 'lightPos' );
		gl.useProgram( this.prog );
		gl.uniform3f( loc, x, y, z);
	}
	
	// This method is called to set the shininess of the material
	setShininess( shininess )
	{
		var loc = gl.getUniformLocation( this.prog, 'shine' );
		gl.useProgram( this.prog );
		gl.uniform1f( loc, shininess );
	}
}


// This function is called for every step of the simulation.
// Its job is to advance the simulation for the given time step duration dt.
// It updates the given positions and velocities.
function SimTimeStep( dt, positions, velocities, springs, stiffness, damping, particleMass, gravity, restitution )
{
	var forces = Array( positions.length ); // The total for per particle

	// We initialize the array
	for (let i = 0; i < positions.length; i++)
	{
		forces[i] = new Vec3(0, 0, 0);
	}

	// We compute every spring force
	for (let i = 0; i < springs.length; i++)
	{
		var p0 = springs[i].p0;
		var p1 = springs[i].p1

		var x0 = positions[p0];
		var x1 = positions[p1];

		var v0 = velocities[p0];
		var v1 = velocities[p1];

		// l = |x1 - x0|
		var l = (x1.sub(x0)).len();
		// d = (x1 - x0) / l
		var d = (x1.sub(x0)).div(l);
		
		// Fs = k * (l - Lr) * d
		var Fs = d.mul(stiffness * (l - springs[i].rest));

		// ls = (v1 - v0) * d
		var ls = (v1.sub(v0)).dot(d);

		// Fd = kd * ls * d
		var Fd = d.mul(damping * ls);

		// Fs0 = Fs + Fd
		forces[p0].inc(Fs);
		forces[p0].inc(Fd);
		// Fs1 = -Fs - Fd
		forces[p1].inc(Fs.mul(-1));
		forces[p1].inc(Fd.mul(-1));
	}

	// We compute the gravitational force and add it to the spring force for each particle
	// in order to derive the acceleration and velocity
	for (let i = 0; i < positions.length; i++)
	{
		// Compute the total force of each particle
		// Fg = m * g
		var Fg = gravity.mul(particleMass);
		// F = Fg + Fs
		forces[i].inc(Fg);

		// Update positions and velocities
		// a = F/m
		var a = forces[i].div(particleMass);
		// v = v + dt * a
		velocities[i].inc(a.mul(dt));
		// p = p + dt * p
		positions[i].inc(velocities[i].mul(dt));
	}

	// Now we handle collisions
	for (let i = 0; i < positions.length; i++)
	{
		if (positions[i].y < -1)
		{
			var h = restitution * -(positions[i].y + 1);
			positions[i].y += h;
			velocities[i].y *= -restitution;
		}
		else if (positions[i].y > 1)
		{
			var h = restitution * -(positions[i].y - 1);
			positions[i].y += h;
			velocities[i].y *= -restitution;
		}
		else if (positions[i].x < -1)
		{
			var h = restitution * -(positions[i].x + 1);
			positions[i].x += h;
			velocities[i].x *= -restitution;
		}
		else if (positions[i].x > 1)
		{
			var h = restitution * -(positions[i].x - 1);
			positions[i].x += h;
			velocities[i].x *= -restitution;
		}
		else if (positions[i].z < -1)
		{
			var h = restitution * -(positions[i].z + 1);
			positions[i].z += h;
			velocities[i].z *= -restitution;
		}
		else if (positions[i].z > 1)
		{
			var h = restitution * -(positions[i].z - 1);
			positions[i].z += h;
			velocities[i].z *= -restitution;
		}
	}
}

// Vertex shader
var meshVS = `
	attribute vec3 pos;
	attribute vec2 txc;
	attribute vec3 norm;

	uniform mat4 mvp;
	uniform bool swap;

	varying vec2 texCoord;
	varying vec4 vertPos;
	varying vec3 normal;

	void main()
	{
		texCoord = txc;
		normal = norm;
		if (swap)
		{
			gl_Position = mvp * vec4(pos[0], pos[2], pos[1], 1);
		}
		else
		{
			gl_Position = mvp * vec4(pos, 1);
		}
		vertPos = gl_Position;
	}
`;

// Fragment shader
var meshFS = `
	precision mediump float;
	uniform sampler2D tex;
	uniform bool show;

	varying vec2 texCoord;
	varying vec4 vertPos;
	varying vec3 normal;

	uniform float shine;
	uniform vec3 lightPos;
	uniform mat3 normalMat;

	void main()
	{
		vec3 norm = normalMat * normal;

		float cosTheta = dot( norm, lightPos );
		cosTheta = clamp( cosTheta, 0.0, 1.0 );

		vec3 viewDir = normalize(-(vertPos.xyz));
		vec3 h = normalize(lightPos + viewDir);

		float cosPhi = dot( norm, h );
		cosPhi = clamp (cosPhi, 0.0, 1.0);
		cosPhi = pow (cosPhi, shine);

		if (show)
		{
			gl_FragColor = cosTheta * texture2D( tex, texCoord ) + cosPhi;
		}
		else
		{
			// gl_FragColor = cosTheta * vec4(1,gl_FragCoord.z*gl_FragCoord.z,0,1);
			gl_FragColor = cosTheta * vec4(1, 1, 1, 1) + cosPhi;
		}
	}
`;
