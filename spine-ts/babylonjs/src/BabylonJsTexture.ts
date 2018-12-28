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
	export class BabylonJsTexture extends Texture {
		texture: BABYLON.Texture;

		constructor (image: HTMLImageElement, scene:BABYLON.Scene) {
			super(image);

			var invertY = false;
			this.texture = new BABYLON.Texture(image.src, scene, false, invertY);
			this.texture.hasAlpha = true;

			// this.texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
    		// this.texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
		}

		setFilters (minFilter: TextureFilter, magFilter: TextureFilter) {
			// this.texture.minFilter = BabylonJsTexture.toBabylonJsTextureFilter(minFilter);
			// this.texture.magFilter = BabylonJsTexture.toBabylonJsTextureFilter(magFilter);

			// Linear
			// console.log('setFilters', minFilter, magFilter);

		}

		setWraps (uWrap: TextureWrap, vWrap: TextureWrap) {
			// this.texture.wrapS = ThreeJsTexture.toThreeJsTextureWrap(uWrap);
			// this.texture.wrapT = ThreeJsTexture.toThreeJsTextureWrap(vWrap);

			// CLAMP_TO_EDGE
			this.texture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
			this.texture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
		}

		dispose () {
			this.texture.dispose();
		}

		static toBabylonJsTextureFilter(filter: TextureFilter) {
			if (filter === TextureFilter.Linear) return 1006;
			else if (filter === TextureFilter.MipMap) return 1008;
			else if (filter === TextureFilter.MipMapLinearNearest) return 1007;
			else if (filter === TextureFilter.MipMapNearestLinear) return 1005;
			else if (filter === TextureFilter.MipMapNearestNearest) return 1004;
			else if (filter === TextureFilter.Nearest) return 1003;
			else throw new Error("Unknown texture filter: " + filter);
		}

		static toBabylonJsTextureWrap(wrap: TextureWrap) {
			if (wrap === TextureWrap.ClampToEdge) return 1001;
			else if (wrap === TextureWrap.MirroredRepeat) return 1002;
			else if (wrap === TextureWrap.Repeat) return 1000;
			else throw new Error("Unknown texture wrap: " + wrap);
		}
	}
}
