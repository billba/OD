type BoxDimension = 'top' | 'left' | 'height' | 'width';

type BoundingBox = Record<BoxDimension, number>;

interface Box {
    tagId: string,
    tagName: string,
    boundingBox: BoundingBox,
}

type BoxZone = 'padded' | 'container' | 'outline' | 'topLeftDrag' | 'bottomRightDrag';

type BoxIds = Record<BoxZone, string>;

type BoxElements = Record<BoxZone, HTMLDivElement>;

type BoundingBoxes = Record<BoxZone, BoundingBox>;

type ODControlAction =
    {
        type: 'Init',
    } | {
        type: 'MouseClick',
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
    }

interface ODControl {
    div: HTMLDivElement,
    height: number,
    width: number,
    boxes: Box[],
    selectedBox?: Box,
    selectionLocked: boolean,
    dragZone?: BoxZone,
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

const dragCircleRadius = 6;
const boundsPadding = dragCircleRadius + 1;
const dragTarget = boundsPadding * 2;
const outlineRadius = 8;
const borderWidth = 3;

function insertBoxes(
    boxes: Box[],
    id: string,
) {
    let control = __ODState.controls[id];
    if (control == undefined) {
        const div = document.getElementById(id) as HTMLDivElement;
        if (div == null) {
            console.log("no such id");
            return;
        }
        control = {
            div,
            height: div.clientHeight,
            width: div.clientWidth,
            boxes,
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

const nullString = '';
const nullDivElement = {} as HTMLDivElement;

function getBoxIds(
    control: ODControl,
    box: Box
): BoxIds {
    return {
        padded: nullString,
        container: `od-${control.div.id}-box-${box.tagId}`,
        outline: `od-${control.div.id}-outline-${box.tagId}`,
        topLeftDrag: `od-${control.div.id}-topleftdrag-${box.tagId}`,
        bottomRightDrag: `od-${control.div.id}-bottomRightDrag-${box.tagId}`,
    }
}

function getBoxElements(boxIds: BoxIds): BoxElements {
    return {
        padded: nullDivElement,
        container: document.getElementById(boxIds.container) as HTMLDivElement,
        outline: document.getElementById(boxIds.outline) as HTMLDivElement,
        topLeftDrag: document.getElementById(boxIds.topLeftDrag) as HTMLDivElement,
        bottomRightDrag: document.getElementById(boxIds.bottomRightDrag) as HTMLDivElement,
    }
}

function getBoundingBoxes(
    control: ODControl,
    box: Box,
): BoundingBoxes {
    const top = control.height * box.boundingBox.top;
    const left = control.width * box.boundingBox.left;
    const height = control.height * box.boundingBox.height;
    const width = control.width * box.boundingBox.width;

    return {
        padded: {
            top: top - boundsPadding,
            left: left - boundsPadding,
            height: height + boundsPadding * 2,
            width: width + boundsPadding * 2,
        },
        container: {
            top: top - dragCircleRadius + borderWidth / 2,
            left: left - dragCircleRadius + borderWidth / 2,
            height: height + dragCircleRadius * 2 - borderWidth,
            width: width + dragCircleRadius * 2 - borderWidth,
        },
        outline: {
            top: dragCircleRadius - borderWidth / 2,
            left: dragCircleRadius - borderWidth / 2,
            height: height - borderWidth * 2,
            width: width - borderWidth * 2,
        },
        topLeftDrag: {
            top: 0,
            left: 0,
            height: (dragCircleRadius - borderWidth) * 2,
            width: (dragCircleRadius - borderWidth) * 2,
        },
        bottomRightDrag: {
            top: height - borderWidth,
            left: width - borderWidth,
            height: (dragCircleRadius - borderWidth) * 2,
            width: (dragCircleRadius - borderWidth) * 2,
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

function ControlReducer(
    control: ODControl,
    action: ODControlAction,
) {
    switch (action.type) {

        case 'MouseClick': {
            if (control.selectedBox) {
                control.selectionLocked = true;
            }
            break;
        }

        case 'MouseDown': {
            control.drag = true;
            control.dragX = action.x;
            control.dragY = action.y;
            break;
        }

        case 'MouseUp': {
            control.drag = false;
            control.dragX = control.dragY = 0;
            break;
        }

        case 'MouseMove': {
            if (control.drag) {
                const box = control.selectedBox!;
                // const x = action.x / control.width;
                // const y = action.y / control.height;
                const dx = action.x - control.dragX;
                const dy = action.y - control.dragY;
                // console.log(control.boxArea, x, y, dx, dy);

                const {container: containerId, outline: outlineId, bottomRightDrag: bottomRightDragId} = getBoxElements(getBoxIds(control, control.selectedBox!));
                const {container, outline, bottomRightDrag} = getBoundingBoxes(control, box);

                switch(control.dragZone) {

                    case 'padded': { 
                        containerId.applyStyles({
                            top: px(container.top + dy),
                            left: px(container.left + dx),
                        });       
                        break;
                    }

                    case 'topLeftDrag': {
                        containerId.applyStyles({
                            top: px(container.top + dy),
                            left: px(container.left + dx),
                            height: px(container.height - dy),
                            width: px(container.width - dx),
                        });

                        outlineId.applyStyles({
                            height: px(outline.height - dy),
                            width: px(outline.width - dx),
                        });

                        bottomRightDragId.applyStyles({
                            top: px(bottomRightDrag.top - dy),
                            left: px(bottomRightDrag.left - dx),
                        });
                        break;
                    }

                    case 'bottomRightDrag': {
                        containerId.applyStyles({
                            height: px(container.height + dy),
                            width: px(container.width + dx),
                        });

                        outlineId.applyStyles({
                            height: px(outline.height + dy),
                            width: px(outline.width + dx),
                        });

                        bottomRightDragId.applyStyles({
                            top: px(bottomRightDrag.top + dy),
                            left: px(bottomRightDrag.left + dx),
                        });
                        break;
                    }

                    default:
                        console.error('unexpected control.boxZone:', control.dragZone);
                        break;
                }
    
                return;
            }

            if (control.selectionLocked) {
                const {padded} = getBoundingBoxes(control, control.selectedBox!);
                if (!whichBoxZone(padded, action.x, action.y))
                    control.selectionLocked = false;
            }

            const [bestBox, bestBoxZone] = getBestBox(control, action.x, action.y);

            if (!control.selectionLocked && bestBox !== control.selectedBox) {
                // change the selection (possibly to nothing)

                for (const box of control.boxes) {
                    const boxIds = getBoxIds(control, box);
                    const boxElements = getBoxElements(boxIds);

                    if (box === bestBox) {
                        // select the new selection
                        boxElements.topLeftDrag.style.visibility = 'visible';
                        boxElements.bottomRightDrag.style.visibility = 'visible';
                        boxElements.outline.style.borderColor = 'rgba(255, 0, 0, 1)';
                    } else {
                        if (box === control.selectedBox) {
                            // unselect the current selection
                            boxElements.topLeftDrag.style.visibility = 'hidden';
                            boxElements.bottomRightDrag.style.visibility = 'hidden';
                        }

                        // dim or undim all the non-selected boxes
                        boxElements.outline.style.borderColor =`rgba(255, 0, 0, ${bestBox ? '.1' : '1'}`;
                    }
                }

                control.selectedBox = bestBox;
                control.selectionLocked = false;
            }

            if (control.selectedBox) {
                switch (bestBoxZone) {
                    case 'topLeftDrag':
                    case 'bottomRightDrag':
                        control.div.style.cursor = 'nwse-resize';
                        break;
                    case 'padded':
                        control.div.style.cursor = 'move';
                        break;
                    default:
                        console.error('unexpected zone from getBestBox:', bestBoxZone);
                        break;
                }

                control.dragZone = bestBoxZone;
            } else {
                control.div.style.setProperty('cursor', 'crosshair');
                control.dragZone = undefined;
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
            mouseInput.onclick = (ev) => {
                ControlReducer(control, {
                    type: 'MouseClick',
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
                })
            }

            const divs = control.boxes.map(box => {
                const boxIds = getBoxIds(control, box);
                const boundingBoxes = getBoundingBoxes(control, box);

                let container = document.createElement('div');
                container.id = boxIds.container;
                container.applyStyles({
                    position: 'absolute',
                    ... pxAll(boundingBoxes.container),
                    // outline: 'blue dashed 1px';
                });

                let outline = document.createElement('div');
                outline.id = boxIds.outline;
                outline.applyStyles({
                    position: 'absolute',
                    ... pxAll(boundingBoxes.outline),
                    border: `red solid ${borderWidth}px`,
                    borderRadius: `${outlineRadius}px`,
                });

                let topLeftDrag = document.createElement('div');
                topLeftDrag.id = boxIds.topLeftDrag;
                topLeftDrag.applyStyles({
                    position: 'absolute',
                    ... pxAll(boundingBoxes.topLeftDrag),
                    border: `red solid ${borderWidth}px`,
                    borderRadius: `100%`,
                    background: 'white',
                    visibility: 'hidden',
                });
        
                let bottomRightDrag = document.createElement('div');
                bottomRightDrag.id = boxIds.bottomRightDrag;
                bottomRightDrag.applyStyles({
                    position: 'absolute',
                    ... pxAll(boundingBoxes.bottomRightDrag),
                    border: `red solid ${borderWidth}px`,
                    borderRadius: '100%',
                    background: 'white',
                    visibility: 'hidden',
                });
        
                container.replaceChildren(outline, topLeftDrag, bottomRightDrag);
        
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
): [Box | undefined, BoxZone | undefined] {
    let bestDistance = Number.MAX_VALUE;
    let bestBox:Box | undefined = undefined;
    let bestBoxZone:BoxZone | undefined = undefined;

    for (const box of control.boxes) {
        const {padded} = getBoundingBoxes(control, box);
        const boxZone = whichBoxZone(padded, x, y);
        if (boxZone) {
            let dx = Math.abs(padded.left + padded.width/2 - x);
            let dy = Math.abs(padded.top + padded.height/2 - y);
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestBox = box;
                bestBoxZone = boxZone;
            }
        }    
    }

    return [bestBox, bestBoxZone];
}

function whichBoxZone(
    padded: BoundingBox,
    x: number,
    y: number,
): BoxZone | undefined {
    if (x >= padded.left && x <= padded.left + padded.width && y >= padded.top && y <= padded.top + padded.height) {
        if (x <= padded.left + dragTarget && y <= padded.top + dragTarget)
            return 'topLeftDrag';
        if (x >= padded.left + padded.width - dragTarget && y >= padded.top + padded.height - dragTarget)
            return 'bottomRightDrag';
        return 'padded';
    }
    return undefined;
}

interface HTMLElement {
    applyStyles(styles: Partial<Record<keyof CSSStyleDeclaration, string>>): void;
}

HTMLElement.prototype.applyStyles = function (styles)
{
    for (const [key, value] of Object.entries(styles)) {
        console.log(key, value);
        (this.style as any)[key] = value === undefined ? null : value;
    }
}
