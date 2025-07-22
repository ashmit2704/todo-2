const Sidebar = ({openSide, setOpenSide}) => {
    return (
        <div className={`sidebar ${!openSide ? 'sidebar-collapsed' : ''}`}>
            <div className="dropdown">
                <img
                    src="/images/angles-left.svg"
                    alt="Toggle Sidebar"
                    className="angles-icon"
                    style={{ cursor: "pointer" }}
                    onClick={() => setOpenSide(!openSide)}
                />
            </div>
            <div className="sidebar-inside">
                <div>
                    <img src="/images/chalkboard.svg" alt="Clipboard" className="sidebar-icon" />
                    <span>Task Board</span>
                </div>
                <div>
                    <img src="/images/clipboard-list-solid.svg" alt="Clipboard" className="sidebar-icon" />
                    <span>To Do</span>
                </div>
                <div>
                    <img src="/images/circle-play.svg" alt="Clipboard" className="sidebar-icon" />
                    <span>In Progress</span>
                </div>
                <div>
                    <img src="/images/circle-check-solid.svg" alt="Clipboard" className="sidebar-icon" />
                    <span>Completed</span>
                </div>
            </div>
        </div>
    )
}

export default Sidebar;