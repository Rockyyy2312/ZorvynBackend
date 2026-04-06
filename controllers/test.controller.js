export const adminContent = (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Admin content accessed successfully',
        user: req.user
    });
};

export const analystContent = (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Analyst content accessed successfully',
        user: req.user
    });
};

export const viewerContent = (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Viewer content accessed successfully',
        user: req.user
    });
};
