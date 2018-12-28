/******************************************************************************
 * Spine Runtimes Software License v2.5
 *
 * Copyright (c) 2013-2016, Esoteric Software
 * All rights reserved.
 *
 * You are granted a perpetual, non-exclusive, non-sublicensable, and
 * non-transferable license to use, install, execute, and perform the Spine
 * Runtimes software and derivative works solely for personal or internal
 * use. Without the written permission of Esoteric Software (see Section 2 of
 * the Spine Software License Agreement), you may not (a) modify, translate,
 * adapt, or develop new applications using the Spine Runtimes or otherwise
 * create derivative works or improvements of the Spine Runtimes or (b) remove,
 * delete, alter, or obscure any trademarks or any copyright, trademark, patent,
 * or other intellectual property or proprietary rights notices on or in the
 * Software, including any copy thereof. Redistributions in binary or source
 * form must include this license and terms.
 *
 * THIS SOFTWARE IS PROVIDED BY ESOTERIC SOFTWARE "AS IS" AND ANY EXPRESS OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
 * EVENT SHALL ESOTERIC SOFTWARE BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES, BUSINESS INTERRUPTION, OR LOSS OF
 * USE, DATA, OR PROFITS) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/

module spine.babylonjs {
	export class MeshBatcher extends BABYLON.Mesh {

		depth:number = 0;

		private static VERTEX_SIZE = 9;
		private verticesLength = 0;
		private indicesLength = 0;

		private maxVerticesLength = 0;
		private maxIndicesLength = 0;

		// private _positions:number[]; // Mesh has this already.
		private _nPositions:number[];
		private _indices:number[];

		// private vertices: Float32Array;
		// private indices: Uint16Array;

		private _colors:number[];
		private _uvs:number[];
		private _normals:number[];

		constructor (name: string, scene: BABYLON.Scene, maxVertices: number = 10920) {
			super(name, scene);
			if (maxVertices > 10920) throw new Error("Can't have more than 10920 triangles per batch: " + maxVertices);

			this.layerMask = 1;
			this.maxVerticesLength = maxVertices * MeshBatcher.VERTEX_SIZE * Float32Array.BYTES_PER_ELEMENT;
			this.maxIndicesLength = maxVertices * 3 * Uint16Array.BYTES_PER_ELEMENT;

			var mat = new spine.babylonjs.SkeletonMeshMaterial('shader_' + name, scene);
			// mat.needDepthPrePass = true;
			this.material = mat;

			this._nPositions = [];
			this._indices = [];
			this._colors = [];
			this._uvs = [];

			this.actionManager = new BABYLON.ActionManager(scene);
		}

		get is():string {
			return 'MeshBatcher';
		}

		clear() {
			this._nPositions = [];
			this._indices = [];
			this._colors = [];
			this._uvs = [];
		}

		begin () {
			this.verticesLength = 0;
			this.indicesLength = 0;
		}

		canBatch(verticesLength: number, indicesLength: number) {
			if (this.indicesLength + indicesLength >= this.maxIndicesLength / 2) return false;
			if (this.verticesLength + verticesLength >= this.maxVerticesLength / 2) return false;

			return true;
		}

		// run by parts
		batch (vertices: ArrayLike<number>, verticesLength: number, indices: ArrayLike<number>, indicesLength: number, z: number = 0) {

			// zoffset 0.1 to 1 for alphaIndex and set margin
			this.alphaIndex = Math.abs(z) * 10 + this.depth * 1000;

			let indexStart = this.verticesLength / MeshBatcher.VERTEX_SIZE;
			let j = 0;
			for (;j < verticesLength;) {
				this._nPositions.push(vertices[j++]);
				this._nPositions.push(vertices[j++]);
				this._nPositions.push(z);

				this._colors.push(vertices[j++]);
				this._colors.push(vertices[j++]);
				this._colors.push(vertices[j++]);
				this._colors.push(vertices[j++]);

				this._uvs.push(vertices[j++]);
				this._uvs.push(vertices[j++]);
			}
			this.verticesLength += verticesLength / 8 * 9;

			for (j = 0; j < indicesLength; j++)
				this._indices.push(indices[j] + indexStart);

			this.indicesLength += indicesLength;
		}

		end () {

			let vertexData = new BABYLON.VertexData();

			vertexData.indices = this._indices;
			vertexData.positions = this._nPositions;
			vertexData.colors = this._colors;
			vertexData.uvs = this._uvs;


			vertexData.applyToMesh(this, true);

			this._nPositions = [];
			this._indices = [];
			this._colors = [];
			this._uvs = [];

			vertexData = null;
		}
	}
}
