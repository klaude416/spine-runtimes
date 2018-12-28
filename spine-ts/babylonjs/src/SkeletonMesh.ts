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
	export class SkeletonMeshMaterial extends BABYLON.ShaderMaterial {
		constructor (name:string, scene:BABYLON.Scene) {
			var route = {
				vertex: "custom",
				fragment: "custom",
			};
			var options = {
				needAlphaBlending : true,
				needAlphaTesting: true,
				attributes: ["position", "uv"],
        		uniforms: ["worldViewProjection", "map"]
				// attributes: ["position", "normal", "uv"],
				// uniforms: ["world", "worldView", "worldViewProjection", "view", "projection"]
			};

			super(name, scene, route, options);
			this.backFaceCulling = false;
			// this.setFloat("time", 0);
			// this.setColor4('color', new BABYLON.Color4(0, 0, 0, 1));
			this.alpha = 1.0;
		};
	}

	export class SkeletonMesh extends BABYLON.AbstractMesh {

		spineSkeleton: spine.Skeleton;
		state: any;
		
		zOffset: number = -0.1;
		vertexEffect: VertexEffect;
		public onPickDownObservable = new BABYLON.Observable<any>();

		// private batcher: MeshBatcher;
		private batches = new Array<MeshBatcher>();
		private nextBatchIndex = 0;
		// private clipper: SkeletonClipping = new SkeletonClipping();

		static QUAD_TRIANGLES = [0, 1, 2, 2, 3, 0];
		static VERTEX_SIZE = 2 + 2 + 4;

		// private vertices = Utils.newFloatArray(1024);
		private vertices = Utils.newFloatArray(8*4);
		private tempColor = new Color();

		constructor (name:string, scene:BABYLON.Scene, skeletonData: SkeletonData) {
			super(name, scene);

			this.spineSkeleton = new spine.Skeleton(skeletonData);
			let animData = new AnimationStateData(skeletonData);
			this.state = new AnimationState(animData);
			this.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
		}

		public getClassName(): string {
			return "SkeletonMesh";
		}

		public setDepth(d:number) {
			this.getDescendants().forEach(function(child) {
				(<MeshBatcher>child).depth = d;
			  });
		}

		update(deltaTime: number) {
			let state = this.state;
			let skeleton = this.spineSkeleton;

			state.update(deltaTime);
			state.apply(skeleton);
			skeleton.updateWorldTransform();

			this.updateGeometry();
		}

		private clearBatches() {
			for (var i = 0; i < this.batches.length; i++) {
				this.batches[i].clear();
				this.batches[i].isVisible = false;
			}

			this.nextBatchIndex = 0;
		}

		private nextBatch() {
			if (this.batches.length == this.nextBatchIndex) {
				let batch = new MeshBatcher('batcher_' + Date.now(), this.getScene());
				// this.addChild(batch); !위치가 반영되지 않는 문제가 있다.
				batch.parent = this;

				// 최하위 노드가 이벤트를 가로채서 부모 노드 선택 이벤트가 발생되지 않는다. 수동으로 한 번 더 notify 해준다.
				let onPickDown = new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickDownTrigger, (evt) => {
					var pickInfo = this.getScene().pick(evt.pointerX, evt.pointerY, (mesh) => {
						return true;
					});

					this.onPickDownObservable.notifyObservers({ name: this.name, pickedPoint: pickInfo.pickedPoint });
				});
				batch.actionManager.registerAction(onPickDown);
				this.batches.push(batch);
				batch.material.freeze();
			}
			let batch = this.batches[this.nextBatchIndex++];
			batch.isVisible = true;
			return batch;
		}

		private updateGeometry() {
			this.clearBatches();

			// let blendMode: BlendMode = null;
			// let clipper = this.clipper;

			let vertices: ArrayLike<number> = this.vertices;
			let triangles: Array<number> = null;
			let uvs: ArrayLike<number> = null;
			let drawOrder = this.spineSkeleton.drawOrder;
			let batch = this.nextBatch();
			batch.begin();
			let z = 0;
			let zOffset = this.zOffset;
			// for (let i = drawOrder.length - 1, n = drawOrder.length; i > 0; i--) {
			for (let i = 0, n = drawOrder.length; i < n; i++) {
				let vertexSize = SkeletonMesh.VERTEX_SIZE;
				// let vertexSize = clipper.isClipping() ? 2 : SkeletonMesh.VERTEX_SIZE;
				let slot = drawOrder[i];
				let attachment = slot.getAttachment();
				let attachmentColor: Color = null;
				let texture: BabylonJsTexture = null;
				let numFloats = 0;
				if (attachment instanceof RegionAttachment) {
					let region = <RegionAttachment>attachment;
					attachmentColor = region.color;
					vertices = this.vertices;
					numFloats = vertexSize * 4;
					// vertices = region.computeWorldVertices(slot, false);
					region.computeWorldVertices(slot.bone, vertices, 0, vertexSize);
					triangles = SkeletonMesh.QUAD_TRIANGLES;
					uvs = region.uvs;
					texture = <BabylonJsTexture>(<TextureAtlasRegion>region.region.renderObject).texture;

				} else if (attachment instanceof MeshAttachment) {
					let mesh = <MeshAttachment>attachment;
					attachmentColor = mesh.color;
					// vertices = mesh.computeWorldVertices(slot, false);
					vertices = this.vertices;
					numFloats = (mesh.worldVerticesLength >> 1) *  vertexSize;
					if (numFloats > vertices.length) {
						vertices = this.vertices = spine.Utils.newFloatArray(numFloats);
					}
					mesh.computeWorldVertices(slot, 0, mesh.worldVerticesLength, vertices, 0, vertexSize);

					triangles = mesh.triangles;
					uvs = mesh.uvs;
					texture = <BabylonJsTexture>(<TextureAtlasRegion>mesh.region.renderObject).texture;
				} else if (attachment instanceof ClippingAttachment) {
					// let clip = <ClippingAttachment>(attachment);
					// clipper.clipStart(slot, clip);
				}
				else continue;

				if (texture != null) {

					let skeleton = slot.bone.skeleton;
 					let skeletonColor = skeleton.color;
 					let slotColor = slot.color;
 					let alpha = skeletonColor.a * slotColor.a * attachmentColor.a;
 					let color = this.tempColor;
 					color.set(skeletonColor.r * slotColor.r * attachmentColor.r,
 							skeletonColor.g * slotColor.g * attachmentColor.g,
 							skeletonColor.b * slotColor.b * attachmentColor.b,
 							alpha);

					let finalVertices: ArrayLike<number>;
					let finalVerticesLength: number;
					let finalIndices: ArrayLike<number>;
					let finalIndicesLength: number;

					// if (this.clipper.isClipping()) {
					if (false) {
						// throw new Error('Not yet developed...');
					} else {
						let verts = vertices;
						// console.log(verts)
						if (this.vertexEffect != null) {
							throw new Error('Not yet developed...');
						} else {
							for (let v = 2, u = 0, n = numFloats; v < n; v += vertexSize, u += 2) {
								verts[v] = color.r;
								verts[v + 1] = color.g;
								verts[v + 2] = color.b;
								verts[v + 3] = color.a;
								verts[v + 4] = uvs[u];
								verts[v + 5] = uvs[u + 1];
							}
						}

						// this.batcher.batch(vertices, triangles, z);
						finalVertices = vertices;
						finalVerticesLength = numFloats;
						finalIndices = triangles;
						finalIndicesLength = triangles.length;
					}


					if (finalVerticesLength == 0 || finalIndicesLength == 0)
						continue;


					if (!batch.canBatch(finalVerticesLength, finalIndicesLength)) {
						batch.end();
						batch = this.nextBatch();
						batch.begin();
					}

					let batchMaterial = <spine.babylonjs.SkeletonMeshMaterial>batch.material;
					if (batchMaterial.getActiveTextures().length == 0) {
						batchMaterial.setTexture('map', texture.texture);
					}
					if (!batchMaterial.hasTexture(texture.texture)) {
						batch.end();
						batch = this.nextBatch();
						batch.begin();
						batchMaterial = <spine.babylonjs.SkeletonMeshMaterial>batch.material;
						batchMaterial.setTexture('map', texture.texture);
					}

					/*
					let batchMaterial = <BABYLON.StandardMaterial>batch.material;
					if (batchMaterial.diffuseTexture == null) {
						batchMaterial.diffuseTexture = texture.texture;
						// batchMaterial.ambientTexture = texture.texture;
						// batchMaterial.specularTexture = texture.texture;
						batchMaterial.opacityTexture = texture.texture;
						batchMaterial.freeze();
					}

					if (batchMaterial.diffuseTexture != texture.texture) {
						batch.end();
						batch = this.nextBatch();
						batch.begin();
						batchMaterial = <BABYLON.StandardMaterial>batch.material;

						batchMaterial.diffuseTexture = texture.texture;
						// batchMaterial.ambientTexture = texture.texture;
						// batchMaterial.specularTexture = texture.texture;
						batchMaterial.opacityTexture = texture.texture;
					}
					*/


					batch.batch(finalVertices, finalVerticesLength, finalIndices, finalIndicesLength, z);
					// batch.batch(finalVertices, finalIndices, z);
					z += zOffset;

				}

				// clipper.clipEndWithSlot(slot);
			}

			// clipper.clipEnd();
			batch.end();
		}

	}
}
