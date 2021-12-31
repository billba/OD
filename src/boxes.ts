interface BoxBounds {
    top: number,
    left: number,
    height: number,
    width: number,
}

interface Box {
    tagId: string,
    tagName: string,
    boundingBox: BoxBounds,
}

type ODControlAction =
    {
        type: 'Init',
    } | {
        type: 'MouseClick',
    } | {
        type: 'MouseMove'
        x: number,
        y: number,
    }

interface ODControl {
    div: HTMLDivElement,
    height: number,
    width: number,
    boxes: Box[],
    selectedBox?: Box,
    selectionLocked: boolean,
    lastAction?: ODControlAction,
}

interface ODState {
    controls: Record<string, ODControl>;
}

let __ODState: ODState = {
    controls: {},
}

const padding = 4;
const dragCircleRadius = 3;
const outlineRadius = 8;
const borderWidth = 2;

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
        }

        ControlReducer(control, {
            type: 'Init'
        });

        __ODState.controls[id] = control;

    }
}

interface BoxRecord<T> {
    container: T,
    outline: T,
    topLeftDrag: T,
    bottomRightDrag: T,
}

type BoxIds = BoxRecord<string>;

type BoxElements = BoxRecord<HTMLDivElement>;

function getBoxIds(
    control: ODControl,
    box: Box
): BoxIds {
    return {
        container: `${control.div.id}-box-${box.tagId}`,
        outline: `${control.div.id}-outline-${box.tagId}`,
        topLeftDrag: `${control.div.id}-topleftdrag-${box.tagId}`,
        bottomRightDrag: `${control.div.id}-bottomRightDrag-${box.tagId}`,
    }
}

function getBoxElements(boxIds: BoxIds): BoxElements {
    return {
        container: document.getElementById(boxIds.container) as HTMLDivElement,
        outline: document.getElementById(boxIds.outline) as HTMLDivElement,
        topLeftDrag: document.getElementById(boxIds.topLeftDrag) as HTMLDivElement,
        bottomRightDrag: document.getElementById(boxIds.bottomRightDrag) as HTMLDivElement,
    }
}

function ControlReducer(
    control: ODControl,
    action: ODControlAction,
) {
    control.lastAction = action;

    switch (action.type) {

        case 'MouseClick': {
            if (control.selectedBox) {
                control.selectionLocked = true;
            }
            break;
        }

        case 'MouseMove': {
            if (control.selectionLocked) {
                const boxBounds = getBoxBounds(control, control.selectedBox!);
                if (!inBoxBounds(boxBounds, action.x, action.y))
                    control.selectionLocked = false;
            }

            if (!control.selectionLocked) {
                const bestBox = getBestBox(control, action.x, action.y);
                if (bestBox === control.selectedBox)
                    return;

                for (const box of control.boxes) {
                    const boxIds = getBoxIds(control, box);
                    const boxElements = getBoxElements(boxIds);

                    // select the new selection, if any
                    if (box === bestBox) {
                        boxElements.topLeftDrag?.style.setProperty('visibility', 'visible');
                        boxElements.bottomRightDrag?.style.setProperty('visibility', 'visible');
                        boxElements.outline?.style.setProperty('border-color', 'rgba(255, 0, 0, 1)');
                    } else {
                        // unselect the current selection, if any

                        if (box === control.selectedBox) {
                            boxElements.topLeftDrag?.style.setProperty('visibility', 'hidden');
                            boxElements.bottomRightDrag?.style.setProperty('visibility', 'hidden');
                        }

                        // dim or undim all the non-selected boxes
                        boxElements.outline?.style.setProperty('border-color', `rgba(255, 0, 0, ${bestBox ? '.1' : '1'}`);
                    }
                }

                control.selectedBox = bestBox;
                control.selectionLocked = false;
            }

            break;
        }

        case 'Init': {
            const mouseInput = document.createElement('div');
            mouseInput.setAttribute('id', `${control.div.id}-mousemove`);
            mouseInput.setAttribute('style', `
                position: absolute;
                top: 0px;
                left: 0px;
                height: ${control.height}px;
                width: ${control.width}px;
            `);
            mouseInput.onmousemove = (ev) => {
                ControlReducer(control, {
                    type: 'MouseMove',
                    x: ev.offsetX,
                    y: ev.offsetY,
                });
            }
            mouseInput.onmousedown = (ev) => {
                ControlReducer(control, {
                    type: 'MouseClick',
                });
            }
    
            const divs = control.boxes.map(box => {
                const boxIds = getBoxIds(control, box); 

                let container = document.createElement('div');
                container.setAttribute('id', boxIds.container);
                container.setAttribute('style', `
                    position: absolute;
                    top: ${control.height * box.boundingBox.top - dragCircleRadius}px;
                    left: ${control.width * box.boundingBox.left - dragCircleRadius}px;
                    height: ${control.height * box.boundingBox.height + dragCircleRadius}px;
                    width: ${control.width * box.boundingBox.width + dragCircleRadius}px;
                `);
        
                let outline = document.createElement('div');
                outline.setAttribute('id', boxIds.outline);
                outline.setAttribute('style', `
                    position: absolute;
                    top: ${dragCircleRadius}px;
                    left: ${dragCircleRadius}px;
                    height: ${control.height * box.boundingBox.height}px;
                    width: ${control.width * box.boundingBox.width}px;
                    border: magenta solid ${borderWidth}px;
                    border-radius: ${outlineRadius}px;
                `);
        
                let topLeftDrag = document.createElement('div');
                topLeftDrag.setAttribute('id', boxIds.topLeftDrag);
                topLeftDrag.setAttribute('style', `
                    position: absolute;
                    top: 0px;
                    left: 0px;
                    height: ${dragCircleRadius * 2}px;
                    width: ${dragCircleRadius * 2}px;
                    border: magenta solid ${borderWidth}px;
                    background: white;
                    border-radius: 100%;
                    visibility: hidden;
                `);
        
                let bottomRightDrag = document.createElement('div');
                bottomRightDrag.setAttribute('id', boxIds.bottomRightDrag);
                bottomRightDrag.setAttribute('style', `
                    position: absolute;
                    top: ${control.height * box.boundingBox.height}px;
                    left: ${control.width * box.boundingBox.width}px;
                    height: ${dragCircleRadius * 2}px;
                    width: ${dragCircleRadius * 2}px;
                    border: magenta solid ${borderWidth}px;
                    background: white;
                    border-radius: 100%;
                    visibility: hidden;
                `);
        
                container.replaceChildren(outline, topLeftDrag, bottomRightDrag);
        
                return container;
            });
        
            control.div.replaceChildren(...divs, mouseInput);
            break;
        }
    }
}

function getBoxBounds(
    control: ODControl,
    box: Box
): BoxBounds {
    return {
        top: control.height * box.boundingBox.top - padding,
        left: control.width * box.boundingBox.left - padding,
        height: control.height * box.boundingBox.height + padding * 2,
        width: control.width * box.boundingBox.width + padding * 2,
    }
}

function getBestBox(
    control: ODControl,
    x: number,
    y: number,
): Box | undefined {
    let bestDistance = Number.MAX_VALUE;
    let bestBox:Box | undefined = undefined;

    for (const box of control.boxes) {
        const boxBounds = getBoxBounds(control, box);

        if (inBoxBounds(boxBounds, x, y)) {
            let dx = Math.abs(boxBounds.left + boxBounds.width/2 - x);
            let dy = Math.abs(boxBounds.top + boxBounds.height/2 - y);
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestBox = box;
            }
        }    
    }

    return bestBox;
}

function inBoxBounds(
    boxBounds: BoxBounds,
    x: number,
    y: number
) {
    return x >= boxBounds.left && x < boxBounds.left + boxBounds.width && y >= boxBounds.top && y < boxBounds.top + boxBounds.height;
}