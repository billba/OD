type BoxDimension = 'top' | 'left' | 'height' | 'width';

type BoundingBox = Record<BoxDimension, number>;

interface Box {
    tagId: string,
    tagName: string,
    boundingBox: BoundingBox,
}

type Zone = 'move' | 'topLeftResize' | 'bottomRightResize' | 'topRightResize' | 'bottomLeftResize' | 'leftResize' | 'rightResize' | 'topResize' | 'bottomResize';
type BoxElement = 'container' | 'outline' | 'topLeftResize' | 'bottomRightResize';

type BoxIds = Record<BoxElement, string>;

type BoxElements = Record<BoxElement, HTMLDivElement>;

type ODControlAction =
    {
        type: 'Init',
    } | {
        type: 'MouseMove',
        x: number,
        y: number,
    } | {
        type: 'MouseDown',
        x: number,
        y: number,
    } | {
        type: 'MouseUp',
        x: number,
        y: number,
    }

interface ODControl {
    div: HTMLDivElement,
    height: number,
    width: number,
    boxes: Box[],
    names: string[],
    selectedBox?: Box,
    selectionLocked: boolean,
    selectedZone?: Zone,
    drag: boolean,
    dragX: number,
    dragY: number,
}

interface ODState {
    controls: Record<string, ODControl>;
}

let __ODState: ODState = {
    controls: {},
}

const dragRadius = 6;
const dragTarget = dragRadius * 2;
const outlineRadius = 8;
const borderWidth = 3;

function insertBoxes(
    id: string,
    boxes: Box[],
    names?: string[],
) {
    let control = __ODState.controls[id];
    if (control == undefined) {
        const div = document.getElementById(id) as HTMLDivElement;
        if (div == null) {
            console.error("no such id");
            return;
        }
        control = {
            div,
            height: div.clientHeight,
            width: div.clientWidth,
            boxes,
            names: names ?? Array.from(new Set(boxes.map(box => box.tagName))),
            selectionLocked: false,
            drag: false,
            dragX: 0,
            dragY: 0,
        }

        ControlReducer(control, {
            type: 'Init'
        });

        __ODState.controls[id] = control;

    }
}

type RGB = [number, number, number];

const colors: RGB[] = [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [255, 255, 0],
    [255, 0, 255],
    [0, 255, 255],
]

function boxColor(
    control: ODControl,
    box: Box
): RGB {
    return colors[control.names.indexOf(box.tagName) % colors.length];
}

function rgba(rgb: RGB, a: number) {
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`
}

const nullString = '';
const nullDivElement = {} as HTMLDivElement;

function getBoxElementIds(
    control: ODControl,
    box: Box
): BoxIds {
    return {
        container: `od-${control.div.id}-box-${box.tagId}`,
        outline: `od-${control.div.id}-outline-${box.tagId}`,
        topLeftResize: `od-${control.div.id}-topLeftResize-${box.tagId}`,
        bottomRightResize: `od-${control.div.id}-bottomRightResize-${box.tagId}`,
    }
}

function getBoxElements(boxIds: BoxIds): BoxElements {
    return {
        container: document.getElementById(boxIds.container) as HTMLDivElement,
        outline: document.getElementById(boxIds.outline) as HTMLDivElement,
        topLeftResize: document.getElementById(boxIds.topLeftResize) as HTMLDivElement,
        bottomRightResize: document.getElementById(boxIds.bottomRightResize) as HTMLDivElement,
    }
}

function getBoxDimensions(control: ODControl, boundingBox: BoundingBox) {
    return {
        top: control.height * boundingBox.top,
        left: control.width * boundingBox.left,
        height: control.height * boundingBox.height,
        width: control.width * boundingBox.width,
    }
}

function getElementBoundingBoxes(
    control: ODControl,
    box: Box,
): Record<BoxElement, BoundingBox> {
    const {top, left, height, width} = getBoxDimensions(control, box.boundingBox);

    return {
        container: {
            top: top - dragRadius + borderWidth / 2,
            left: left - dragRadius + borderWidth / 2,
            height: height + dragRadius * 2 - borderWidth,
            width: width + dragRadius * 2 - borderWidth,
        },
        outline: {
            top: dragRadius - borderWidth / 2,
            left: dragRadius - borderWidth / 2,
            height: height - borderWidth * 2,
            width: width - borderWidth * 2,
        },
        topLeftResize: {
            top: 0,
            left: 0,
            height: (dragRadius - borderWidth) * 2,
            width: (dragRadius - borderWidth) * 2,
        },
        bottomRightResize: {
            top: height - borderWidth,
            left: width - borderWidth,
            height: (dragRadius - borderWidth) * 2,
            width: (dragRadius - borderWidth) * 2,
        },
    }
}
    
function getZoneBoundingBoxes(
    control: ODControl,
    box: Box,
): Record<Zone, BoundingBox> {
    const {top, left, height, width} = getBoxDimensions(control, box.boundingBox);

    return {
        move: {
            top: top + dragRadius,
            left: left + dragRadius,
            height: height - dragTarget,
            width: width - dragTarget,
        },
        topLeftResize: {
            top: top - dragRadius,
            left: left - dragRadius,
            height: dragTarget,
            width: dragTarget,
        },
        topResize: {
            top: top - dragRadius,
            left: left + dragRadius,
            height: dragTarget,
            width: width - dragTarget,
        },
        topRightResize: {
            top: top - dragRadius,
            left: left + width - dragTarget,
            height: dragTarget,
            width: dragTarget,
        },
        leftResize: {
            top: top + dragRadius,
            left: left - dragRadius,
            height: height - dragTarget,
            width: dragTarget,
        },
        rightResize: {
            top: top + dragRadius,
            left: left + width - dragRadius,
            height: height - dragTarget,
            width: dragTarget,
        },
        bottomLeftResize: {
            top: top + height - dragRadius,
            left: left - dragRadius,
            height: dragTarget,
            width: dragTarget,
        },
        bottomResize: {
            top: top + height - dragRadius,
            left: left + dragRadius,
            height: dragTarget,
            width: width - dragTarget,
        },
        bottomRightResize: {
            top: top + height - dragRadius,
            left: left + width - dragRadius,
            height: dragTarget,
            width: dragTarget,
        },
    }
}

function px(num: number): string {
    return `${num}px`;
}

function pxAll(boxBounds: BoundingBox) {
    return {
        top: px(boxBounds.top),
        left: px(boxBounds.left),
        height: px(boxBounds.height),
        width: px(boxBounds.width),
    }
}

// every container is a superset of its outline, so in this object we only list container dimensions that don't
// exist in the outline. The getZoneDimensions function merges them together
const zoneDimensions: Record<Zone, Partial<Record<BoxElement, Partial<Record<BoxDimension, 1 | -1>>>>> = {
    move: {
        container: {
            top: 1,
            left: 1,
        },
    },
    topLeftResize: {
        container: {
            top: 1,
            left: 1,
        },
        outline: {
            height: -1,
            width: -1,
        },
        bottomRightResize: {
            top: -1,
            left: -1,
        },
    },
    topResize: {
        container: {
            top: 1,
        },
        outline: {
            height: -1,
        },
        bottomRightResize: {
            top: -1,
        }
    },
    topRightResize: {
        container: {
            top: 1,
        },
        outline: {
            height: -1,
            width: 1,
        },
        bottomRightResize: {
            top: -1,
            left: 1,
        },
    },
    leftResize: {
        container: {
            left: 1,
        },
        outline: {
            width: -1,
        },
        bottomRightResize: {
            left: -1,
        },
    },
    rightResize: {
        outline: {
            width: 1,
        },
        bottomRightResize: {
            left: 1,
        },
    },
    bottomLeftResize: {
        container: {
            left: 1,
        },
        outline: {
            height: 1,
            width: -1,
        },
        bottomRightResize: {
            top: 1,
            left: -1,
        },
    },
    bottomResize: {
        outline: {
            height: 1,
        },
        bottomRightResize: {
            top: 1,
        }
    },
    bottomRightResize: {
        container: {
            height: 1,
            width: 1,
        },
        outline: {
            height: 1,
            width: 1,
        },
        bottomRightResize: {
            top: 1,
            left: 1,
        }
    },
}

function getZoneDimensions(zone: Zone): Partial<Record<BoxElement, Partial<Record<BoxDimension, 1 | -1>>>> {
    const elementDimensions = zoneDimensions[zone];
    return {
        outline: elementDimensions.outline??{},
        container: {...elementDimensions.outline??{}, ...elementDimensions.container??{}},
        bottomRightResize: elementDimensions.bottomRightResize??{},
    }
}

const cursors = {
    move: 'move',
    topResize:'ns-resize',
    bottomResize: 'ns-resize',
    leftResize:'ew-resize',
    rightResize: 'ew-resize',
    topLeftResize:'nwse-resize',
    bottomRightResize: 'nwse-resize',
    topRightResize: 'nesw-resize',
    bottomLeftResize: 'nesw-resize',
}

function ControlReducer(
    control: ODControl,
    action: ODControlAction,
) {
    switch (action.type) {

        case 'MouseDown': {
            control.drag = true;
            control.dragX = action.x;
            control.dragY = action.y;
            if (control.selectedBox)
                control.selectionLocked = true;
            break;
        }

        case 'MouseUp': {
            if (action.x != control.dragX || action.y != control.dragY) {
                if (control.selectedBox) {
                    const dx = (action.x - control.dragX)/control.width;
                    const dy = (action.y - control.dragY)/control.height;

                    for (const [dimension, delta] of Object.entries(getZoneDimensions(control.selectedZone!).container!)) {
                        control.selectedBox.boundingBox[dimension as BoxDimension] += delta * (dimension == 'top' || dimension == 'height' ? dy : dx);
                    }
                } else {
                // finish adding a box
                }
            }
            control.drag = false;
            control.dragX = control.dragY = 0;
            break;
        }

        case 'MouseMove': {
            if (control.drag) {
                const dx = action.x - control.dragX;
                const dy = action.y - control.dragY;

                const boxElements = getBoxElements(getBoxElementIds(control, control.selectedBox!));
                const boundingBoxes = getElementBoundingBoxes(control, control.selectedBox!);

                for (const [element, deltas] of Object.entries(getZoneDimensions(control.selectedZone!))) {
                    const styles: Partial<Record<keyof CSSStyleDeclaration, string>> = {};
                    for (const [dimension, delta] of Object.entries(deltas)) {
                        styles[dimension as keyof CSSStyleDeclaration] = px(boundingBoxes[element as BoxElement][dimension as BoxDimension] + delta * (dimension == 'top' || dimension == 'height' ? dy : dx));
                    }
        
                    boxElements[element as BoxElement].applyStyles(styles);
                }

                return;
            }

            if (control.selectionLocked) {
                control.selectedZone = whichZone(getZoneBoundingBoxes(control, control.selectedBox!), action.x, action.y);
                if (!control.selectedZone)
                    control.selectionLocked = false;
            }

            if (!control.selectionLocked) {
                const [bestBox, bestZone] = getBestBox(control, action.x, action.y);

                if (bestBox !== control.selectedBox) {
                    // change the selection (possibly to nothing)

                    for (const box of control.boxes) {
                        const boxIds = getBoxElementIds(control, box);
                        const boxElements = getBoxElements(boxIds);
                        const rgb = boxColor(control, box);

                        if (box === bestBox) {
                            // select the new selection
                            boxElements.topLeftResize.style.visibility = 'visible';
                            boxElements.bottomRightResize.style.visibility = 'visible';
                            boxElements.outline.style.borderColor = rgba(rgb, 1);
                        } else {
                            if (box === control.selectedBox) {
                                // unselect the current selection
                                boxElements.topLeftResize.style.visibility = 'hidden';
                                boxElements.bottomRightResize.style.visibility = 'hidden';
                            }

                            // dim or undim all the non-selected boxes
                            boxElements.outline.style.borderColor = rgba(rgb, bestBox ? .1 : 1);
                        }
                    }
                    control.selectedBox = bestBox;
                }

                control.selectedZone = bestZone;
            }

            if (control.selectedBox) {
                control.div.style.cursor = cursors[control.selectedZone!]
            } else {
                control.div.style.cursor = 'crosshair';
                control.selectedZone = undefined;
            }

            break;
        }

        case 'Init': {
            const mouseInput = document.createElement('div');
            mouseInput.id = `${control.div.id}-mousemove`;
            mouseInput.applyStyles({
                position: `absolute`,
                top: `0px`,
                left: `0px`,
                height: `${control.height}px`,
                width: `${control.width}px`,
            });
            mouseInput.onmousemove = (ev) => {
                ControlReducer(control, {
                    type: 'MouseMove',
                    x: ev.offsetX,
                    y: ev.offsetY,
                });
            }
            mouseInput.onmousedown = (ev) => {
                ControlReducer(control, {
                    type: 'MouseDown',
                    x: ev.offsetX,
                    y: ev.offsetY,
                })
            }
            mouseInput.onmouseup = (ev) => {
                ControlReducer(control, {
                    type: 'MouseUp',
                    x: ev.offsetX,
                    y: ev.offsetY,
                })
            }

            const divs = control.boxes.map(box => {
                const boxIds = getBoxElementIds(control, box);
                const boundingBoxes = getElementBoundingBoxes(control, box);
                const rgb = boxColor(control, box);

                let container = document.createElement('div');
                container.id = boxIds.container;
                container.applyStyles({
                    position: 'absolute',
                    ... pxAll(boundingBoxes.container),
                    // outline: 'blue dashed 1px',
                });

                let outline = document.createElement('div');
                outline.id = boxIds.outline;
                outline.applyStyles({
                    position: 'absolute',
                    ... pxAll(boundingBoxes.outline),
                    border: `${rgba(rgb, 1)} solid ${borderWidth}px`,
                    borderRadius: `${outlineRadius}px`,
                });

                let topLeftResize = document.createElement('div');
                topLeftResize.id = boxIds.topLeftResize;
                topLeftResize.applyStyles({
                    position: 'absolute',
                    ... pxAll(boundingBoxes.topLeftResize),
                    border: `${rgba(rgb, 1)} solid ${borderWidth}px`,
                    borderRadius: `100%`,
                    background: 'white',
                    visibility: 'hidden',
                });
        
                let bottomRightResize = document.createElement('div');
                bottomRightResize.id = boxIds.bottomRightResize;
                bottomRightResize.applyStyles({
                    position: 'absolute',
                    ... pxAll(boundingBoxes.bottomRightResize),
                    border: `${rgba(rgb, 1)} solid ${borderWidth}px`,
                    borderRadius: '100%',
                    background: 'white',
                    visibility: 'hidden',
                });
        
                container.replaceChildren(outline, topLeftResize, bottomRightResize);
        
                return container;
            });
        
            control.div.replaceChildren(...divs, mouseInput);
            control.div.style.cursor = 'crosshair';
            break;
        }
    }
}

function getBestBox(
    control: ODControl,
    x: number,
    y: number,
): [Box | undefined, Zone | undefined] {
    let bestDistance = Number.MAX_VALUE;
    let bestBox: Box | undefined = undefined;
    let bestZone: Zone | undefined = undefined;

    for (const box of control.boxes) {
        const zone = whichZone(getZoneBoundingBoxes(control, box), x, y);
        if (zone) {
            const boxDimensions = getBoxDimensions(control, box.boundingBox);
            let dx = Math.abs(boxDimensions.left + boxDimensions.width/2 - x);
            let dy = Math.abs(boxDimensions.top + boxDimensions.height/2 - y);
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestBox = box;
                bestZone = zone;
            }
        }    
    }

    return [bestBox, bestZone];
}

function whichZone(
    zones: Record<Zone, BoundingBox>,
    x: number,
    y: number,
): Zone | undefined {
    for (const [zone, boundingBox] of Object.entries(zones)) {
        if (x >= boundingBox.left && x < boundingBox.left + boundingBox.width && y >= boundingBox.top && y <= boundingBox.top + boundingBox.height) {
            return zone as Zone;
        }
    }
    return undefined;
}

interface HTMLElement {
    applyStyles(styles: Partial<Record<keyof CSSStyleDeclaration, string>>): void;
}

HTMLElement.prototype.applyStyles = function (styles)
{
    for (const [key, value] of Object.entries(styles)) {
        (this.style as any)[key] = value === undefined ? null : value;
    }
}
