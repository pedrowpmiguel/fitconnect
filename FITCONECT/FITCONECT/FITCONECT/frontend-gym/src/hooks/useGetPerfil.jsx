import { useCallback, useEffect, useState } from "react";
export const useGetPerfil = (url = "") => {
    const [isError, setError] = useState(false);
    const [isLoading, setLoading] = useState(false);
    const [user, setUser] = useState({
        data: {},
    });
    const fetchingData = useCallback(() => {
        const querie = `/api/${url}/profile`;
        setLoading(true);
        fetch(querie, {
            headers: { Accept: "application/json" },
        })
            .then((response) => response.json())
            .then((response) => {
                const { data = {} } = response;
                setUser({
                    data: data,
                });
            })
            .catch((error) => {
                console.error("Error:", error);
                setError(error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [url]);
    useEffect(() => {
        fetchingData();
    }, []);
    return {
        user,
        isError,
        isLoading,
        load: fetchingData,
    };
};