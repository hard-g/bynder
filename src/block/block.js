// Import Compact View
import { CompactView, Modal, Login } from "@bynder/compact-view";

// Import CSS
import "./editor.scss";
import "./style.scss";

// Import WordPress packages
const { createBlock, registerBlockType } = wp.blocks;
const { createHigherOrderComponent } = wp.compose;
const { dispatch } = wp.data;
const { cloneElement, createElement, Fragment } = wp.element;
const { addFilter } = wp.hooks;

const bynderLogo = props => (
	<svg width={24} height={24} viewBox="0 0 20 20" {...props}>
		<g fill="none" fillRule="evenodd">
			<rect width={20} height={20} fill="#0AF" rx={4} />
			<path
				fill="#FFF"
				fillRule="nonzero"
				d="M13.65 4.752c-.958-.001-1.87.412-2.5 1.133L6.69 10.338 5.416 9.062a1.315 1.315 0 01-.336-.895 1.34 1.34 0 011.349-1.341c.326-.004.642.116.885.334.08.07.305.304.305.304l1.412-1.412-.408-.408a3.295 3.295 0 00-2.275-.892 3.323 3.323 0 00-3.327 3.32c0 .807.29 1.587.818 2.197L6.7 13.144l5.982-5.982c.244-.22.562-.34.89-.336a1.34 1.34 0 011.341 1.351c.003.327-.117.644-.335.888l-3.976 3.975a.836.836 0 01-1.203-.01l-.3-.296-1.405 1.405.288.283c.531.544 1.26.85 2.02.85h.001c.757.001 1.482-.305 2.009-.848l4.143-4.152a3.332 3.332 0 00-2.506-5.52z"
			/>
		</g>
	</svg>
);

const assetTypes = ["IMAGE", "VIDEO", "DOCUMENT"];
const assetFieldSelection = `
  databaseId
  name
  type
  files
  ... on Video {
    previewUrls
  }
`;

// Set hook to blocks.registerBlockType to add bynder related attributes to core/image, core/video and core/gallery blocks
addFilter("blocks.registerBlockType", "bynderAttributes", settings => {
	// Check if object exists for old Gutenberg version compatibility
	if (typeof settings.attributes !== "undefined") {
		if (["core/image", "core/video"].includes(settings.name)) {
			settings.attributes = Object.assign(settings.attributes, {
				bynder: {
					type: "string",
					source: "attribute",
					selector: "figure",
					attribute: "data-bynder-id",
					default: ""
				}
			});
		}
		if (settings.name == "core/file") {
			settings.attributes = Object.assign(settings.attributes, {
				bynder: {
					type: "string",
					source: "attribute",
					selector: "div",
					attribute: "data-bynder-id",
					default: ""
				}
			});
		}
		if (settings.name === "core/gallery") {
			settings.attributes = Object.assign(settings.attributes, {
				bynderGallery: {
					type: "boolean",
					default: false
				},
				isOpen: {
					type: "boolean",
					default: false
				}
			});
			settings.attributes.images.query = Object.assign(
				settings.attributes.images.query,
				{
					bynder: {
						type: "string",
						source: "attribute",
						selector: "figure",
						attribute: "data-bynder-id",
						default: ""
					}
				}
			);
		}
	}
	return settings;
});

// Set hook to blocks.getSaveElement to insert bynder assets ids to figure tags
addFilter(
	"blocks.getSaveElement",
	"bynderIds",
	(element, block, attributes) => {
		// Add bynder id to images and videos
		if (
			["core/image", "core/video", "core/file"].includes(block.name) &&
			attributes.bynder
		) {
			return cloneElement(element, {
				"data-bynder-id": attributes.bynder
			});
		}
		// Add bynder id to images in gallery
		if (block.name === "core/gallery" && attributes.bynderGallery) {
			var bynderGallery = createElement(
				"figure",
				{
					className: element.props.className
				},
				createElement(
					"ul",
					{
						className: "blocks-gallery-grid"
					},
					attributes.images.map(function(image) {
						return createElement(
							"li",
							{
								className: "blocks-gallery-item"
							},
							createElement(
								"figure",
								{
									"data-bynder-id": image.bynder
								},
								createElement("img", {
									src: image.url,
									alt: image.alt
								})
							)
						);
					})
				)
			);

			return bynderGallery;
		}
		return element;
	}
);

// Set hook to editor.BlockEdit to not render gallery default buttons for bynder gallery and handle compact view to add more images to gallery
addFilter(
	"editor.BlockEdit",
	"bynderGallery",
	createHigherOrderComponent(BlockEdit => props => {
		var attributes = props.attributes;
		if (props.name === "core/gallery" && attributes.bynderGallery) {
			var openModal = () => {
				props.setAttributes({
					isOpen: true
				});
			};

			var closeModal = () => {
				props.setAttributes({
					isOpen: false
				});
			};

			var addToGallery = assets => {
				var newGalleryImages = assets.map(asset => {
					return {
						url: asset.derivatives.webImage,
						alt: asset.name,
						bynder: asset.databaseId
					};
				});

				dispatch("core/block-editor").updateBlockAttributes(props.clientId, {
					images: [...attributes.images, ...newGalleryImages]
				});
				closeModal();
			};

			return (
				<Fragment>
					<div className="bynder-gallery">
						<BlockEdit {...props} />
						<div className="compact-view-button">
							<React.Fragment>
								<button
									onClick={openModal}
									className="components-button button button-large"
								>
									Open Compact View
								</button>

								<Modal isOpen={attributes.isOpen} onClose={closeModal}>
									<Login portal={{url: cgbGlobal.bynderDomain, editable: false}}>
										<CompactView
											language={cgbGlobal.language}
											assetTypes={["IMAGE"]}
											/*assetFieldSelection={assetFieldSelection}*/
											onSuccess={addToGallery}
											defaultSearchTerm={cgbGlobal.bynderDefaultSearchTerm}
										/>
									</Login>
								</Modal>
							</React.Fragment>
						</div>
					</div>
				</Fragment>
			);
		}
		return <BlockEdit {...props} />;
	})
);

/**
 * Register a Gutenberg Block for Bynder Asset
 *
 * Registers a new block provided a unique name and an object defining its
 * behavior. Once registered, the block is made editor as an option to any
 * editor interface where blocks are implemented.
 *
 * @link https://wordpress.org/gutenberg/handbook/block-api/
 * @param  {string}   name     Block name.
 * @param  {Object}   settings Block settings.
 * @return {?WPBlock}          The block, if it has been successfully
 *                             registered; otherwise `undefined`.
 */
registerBlockType("bynder/bynder-asset-block", {
	title: "Bynder Asset",
	icon: bynderLogo,
	category: "common",
	attributes: {
		isOpen: {
			type: "boolean",
			default: false
		}
	},
	/**
	 * The edit function describes the structure of your block in the context of the editor.
	 * This represents what the editor will render when the block is used.
	 *
	 * The "edit" property must be a valid function.
	 *
	 * @link https://wordpress.org/gutenberg/handbook/block-api/block-edit-save/
	 *
	 * @param {Object} props Props.
	 * @returns {Mixed} JSX Component.
	 */
	edit: props => {
		var attributes = props.attributes;

		var openModal = () => {
			props.setAttributes({
				isOpen: true
			});
		};

		var closeModal = () => {
			props.setAttributes({
				isOpen: false
			});
		};

		var addAsset = assets => {
			const asset = assets[0];
			var block;

			let caption = ''
			if ( asset.hasOwnProperty( 'textMetaproperties' ) ) {
				asset.textMetaproperties.forEach(function(v,k){
					if ( v.name === 'caption' ) {
						caption = v.value
						return
					}
				})
			}

			switch (asset.type) {
				case "IMAGE":
					var file = asset.files[cgbGlobal.bynderImageDerivative] || asset.files.webImage;

					block = createBlock("core/image", {
						// Fetching the webimage derivative by default
						url: file.url,
						alt: caption,
						caption: caption,
						bynder: asset.databaseId
					});
					break;
				case "VIDEO":
					// Fetching the mp4 video preview url by default
					var url = asset.previewUrls.find(previewUrl => {
						var extension = previewUrl.split(".").pop();
						return extension === "mp4";
					});
					block = createBlock("core/video", {
						src: url,
						bynder: asset.databaseId
					});
					break;
				case "DOCUMENT":
					if(asset.files.original === undefined) {
						alert(asset.name + " is not marked as public and cannot be selected.");
						break;
					}
					block = createBlock("core/file", {
						href: asset.files.original.url,
						fileName: asset.name,
						bynder: asset.databaseId
					});
					break;
			}
			if (block !== undefined) {
				dispatch("core/block-editor").replaceBlock(props.clientId, block);
				closeModal();
			}
		};

		return (
			<React.Fragment>
				<button
					onClick={openModal}
					className="components-button button button-large"
				>
					Open Compact View
				</button>

				<Modal isOpen={attributes.isOpen} onClose={closeModal}>
					<Login portal={{url: cgbGlobal.bynderDomain, editable: false}}>
						<CompactView
							language={cgbGlobal.language}
							mode="SingleSelect"
							assetTypes={assetTypes}
							/*assetFieldSelection={assetFieldSelection}*/
							onSuccess={addAsset}
							defaultSearchTerm={cgbGlobal.bynderDefaultSearchTerm}
						/>
					</Login>
				</Modal>
			</React.Fragment>
		);
	},

	/**
	 * The save function defines the way in which the different attributes should be combined
	 * into the final markup, which is then serialized by Gutenberg into post_content.
	 *
	 * The "save" property must be specified and must be a valid function.
	 *
	 * @link https://wordpress.org/gutenberg/handbook/block-api/block-edit-save/
	 *
	 * @param {Object} props Props.
	 */
	save: props => {}
});

/**
 * Register a Gutenberg Block for Bynder Gallery
 *
 * Registers a new block provided a unique name and an object defining its
 * behavior. Once registered, the block is made editor as an option to any
 * editor interface where blocks are implemented.
 *
 * @link https://wordpress.org/gutenberg/handbook/block-api/
 * @param  {string}   name     Block name.
 * @param  {Object}   settings Block settings.
 * @return {?WPBlock}          The block, if it has been successfully
 *                             registered; otherwise `undefined`.
 */
registerBlockType("bynder/bynder-gallery-block", {
	title: "Bynder Gallery",
	icon: bynderLogo,
	category: "common",
	attributes: {
		isOpen: {
			type: "boolean",
			default: false
		}
	},
	/**
	 * The edit function describes the structure of your block in the context of the editor.
	 * This represents what the editor will render when the block is used.
	 *
	 * The "edit" property must be a valid function.
	 *
	 * @link https://wordpress.org/gutenberg/handbook/block-api/block-edit-save/
	 *
	 * @param {Object} props Props.
	 * @returns {Mixed} JSX Component.
	 */
	edit: props => {
		var attributes = props.attributes;

		var openModal = () => {
			props.setAttributes({
				isOpen: true
			});
		};

		var closeModal = () => {
			props.setAttributes({
				isOpen: false
			});
		};

		var addGallery = assets => {
			var galleryImages = assets.map(asset => {
				console.log(asset);
				var file = asset.files[cgbGlobal.bynderImageDerivative] || asset.files.webImage;
				return {
					url: file.url,
					alt: asset.name,
					bynder: asset.databaseId
				};
			});
			var block = createBlock("core/gallery", {
				images: galleryImages,
				bynderGallery: true
			});
			dispatch("core/block-editor").replaceBlock(props.clientId, block);
			closeModal();
		};

		return (
			<React.Fragment>
				<button
					onClick={openModal}
					className="components-button button button-large"
				>
					Open Compact View
				</button>

				<Modal isOpen={attributes.isOpen} onClose={closeModal}>
					<Login portal={{url: cgbGlobal.bynderDomain, editable: false}}>
						<CompactView
							language={cgbGlobal.language}
							assetTypes={["IMAGE"]}
							/*assetFieldSelection={assetFieldSelection}*/
							onSuccess={addGallery}
							defaultSearchTerm={cgbGlobal.bynderDefaultSearchTerm}
						/>
					</Login>
				</Modal>
			</React.Fragment>
		);
	},

	/**
	 * The save function defines the way in which the different attributes should be combined
	 * into the final markup, which is then serialized by Gutenberg into post_content.
	 *
	 * The "save" property must be specified and must be a valid function.
	 *
	 * @link https://wordpress.org/gutenberg/handbook/block-api/block-edit-save/
	 *
	 * @param {Object} props Props.
	 */
	save: props => {}
});
