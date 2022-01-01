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

type BoxKey = keyof BoxElements;

function getBoxIds(
    control: ODControl,
    box: Box
): BoxIds {
    return {
        container: `od-${control.div.id}-box-${box.tagId}`,
        outline: `od-${control.div.id}-outline-${box.tagId}`,
        topLeftDrag: `od-${control.div.id}-topleftdrag-${box.tagId}`,
        bottomRightDrag: `od-${control.div.id}-bottomRightDrag-${box.tagId}`,
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
                if (!whereInBoxBounds(boxBounds, action.x, action.y))
                    control.selectionLocked = false;
            }

            const [bestBox, bestBoxKey] = getBestBox(control, action.x, action.y);

            if (!control.selectionLocked && bestBox !== control.selectedBox) {
                // change the selection (possibly to nothing)

                for (const box of control.boxes) {
                    const boxIds = getBoxIds(control, box);
                    const boxElements = getBoxElements(boxIds);

                    if (box === bestBox) {
                        // select the new selection
                        boxElements.topLeftDrag?.style.setProperty('visibility', 'visible');
                        boxElements.bottomRightDrag?.style.setProperty('visibility', 'visible');
                        boxElements.outline?.style.setProperty('border-color', 'rgba(255, 0, 0, 1)');

                    } else {

                        if (box === control.selectedBox) {
                            // unselect the current selection
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

            if (control.selectedBox) {
                switch (bestBoxKey) {
                    case 'topLeftDrag':
                    case 'bottomRightDrag':
                        control.div.style.setProperty('cursor', 'nwse-resize');
                        break;
                    default:
                        control.div.style.setProperty('cursor', 'move');
                        break;
                }
            } else {
                control.div.style.setProperty('cursor', 'crosshair');
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
                const top = control.height * box.boundingBox.top;
                const left = control.width * box.boundingBox.left;
                const height = control.height * box.boundingBox.height;
                const width = control.width * box.boundingBox.width;

                let container = document.createElement('div');
                container.setAttribute('id', boxIds.container);
                // outline: blue dashed 1px;
                container.setAttribute('style', `
                    position: absolute;
                    top: ${top - dragCircleRadius + borderWidth / 2}px;
                    left: ${left - dragCircleRadius + borderWidth / 2}px;
                    height: ${height + dragCircleRadius * 2 - borderWidth}px;
                    width: ${width + dragCircleRadius * 2 - borderWidth}px;
                `);
                let outline = document.createElement('div');
                outline.setAttribute('id', boxIds.outline);
                outline.setAttribute('style', `
                    position: absolute;
                    top: ${dragCircleRadius - borderWidth / 2}px;
                    left: ${dragCircleRadius - borderWidth / 2}px;
                    height: ${height - borderWidth * 2}px;
                    width: ${width - borderWidth * 2}px;
                    border: red solid ${borderWidth}px;
                    border-radius: ${outlineRadius}px;
                `);
        
                let topLeftDrag = document.createElement('div');
                topLeftDrag.setAttribute('id', boxIds.topLeftDrag);
                topLeftDrag.setAttribute('style', `
                    position: absolute;
                    top: 0px;
                    left: 0x;
                    height: ${(dragCircleRadius - borderWidth) * 2}px;
                    width: ${(dragCircleRadius - borderWidth) * 2}px;
                    border: red solid ${borderWidth}px;
                    background: white;
                    border-radius: 100%;
                    visibility: hidden;
                `);
        
                let bottomRightDrag = document.createElement('div');
                bottomRightDrag.setAttribute('id', boxIds.bottomRightDrag);
                bottomRightDrag.setAttribute('style', `
                    position: absolute;
                    top: ${height - borderWidth}px;
                    left: ${width - borderWidth}px;
                    height: ${(dragCircleRadius - borderWidth) * 2}px;
                    width: ${(dragCircleRadius - borderWidth) * 2}px;
                    border: red solid ${borderWidth}px;
                    background: white;
                    border-radius: 100%;
                    visibility: hidden;
                `);
        
                container.replaceChildren(outline, topLeftDrag, bottomRightDrag);
        
                return container;
            });
        
            control.div.replaceChildren(...divs, mouseInput);
            control.div.style.setProperty('cursor', 'crosshair');
            break;
        }
    }
}

function getBoxBounds(
    control: ODControl,
    box: Box
): BoxBounds {
    return {
        top: control.height * box.boundingBox.top - boundsPadding,
        left: control.width * box.boundingBox.left - boundsPadding,
        height: control.height * box.boundingBox.height + boundsPadding * 2,
        width: control.width * box.boundingBox.width + boundsPadding * 2,
    }
}

function getBestBox(
    control: ODControl,
    x: number,
    y: number,
): [Box | undefined, BoxKey | undefined] {
    let bestDistance = Number.MAX_VALUE;
    let bestBox:Box | undefined = undefined;
    let bestBoxKey:BoxKey | undefined = undefined;

    for (const box of control.boxes) {
        const boxBounds = getBoxBounds(control, box);
        const boxKey = whereInBoxBounds(boxBounds, x, y);
        if (boxKey) {
            let dx = Math.abs(boxBounds.left + boxBounds.width/2 - x);
            let dy = Math.abs(boxBounds.top + boxBounds.height/2 - y);
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestBox = box;
                bestBoxKey = boxKey;
            }
        }    
    }

    return [bestBox, bestBoxKey];
}

function whereInBoxBounds(
    boxBounds: BoxBounds,
    x: number,
    y: number
): BoxKey | undefined {
    if (x >= boxBounds.left && x <= boxBounds.left + boxBounds.width && y >= boxBounds.top && y <= boxBounds.top + boxBounds.height) {
        if (x <= boxBounds.left + dragTarget && y <= boxBounds.top + dragTarget)
            return 'topLeftDrag';
        if (x >= boxBounds.left + boxBounds.width - dragTarget && y >= boxBounds.top + boxBounds.height - dragTarget)
            return 'bottomRightDrag';
        return 'container';
    }
    return undefined;
}